#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const MAX_RETRIES = Number(process.env.RELEASE_MAX_RETRIES || 8);
const BASE_RETRY_MS = Number(process.env.RELEASE_BASE_RETRY_MS || 2000);
const UPLOAD_DELAY_MS = Number(process.env.RELEASE_UPLOAD_DELAY_MS || 700);
const RELEASE_TAG = process.env.RELEASE_TAG || 'latest';
const API_BASE = process.env.GITHUB_API_URL || 'https://api.github.com';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryDelayMs(response, attempt) {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const retrySeconds = Number(retryAfter);
    if (Number.isFinite(retrySeconds) && retrySeconds > 0) {
      return retrySeconds * 1000;
    }
  }

  const resetHeader = response.headers.get('x-ratelimit-reset');
  if (resetHeader) {
    const resetEpoch = Number(resetHeader);
    if (Number.isFinite(resetEpoch) && resetEpoch > 0) {
      const waitMs = resetEpoch * 1000 - Date.now() + 1000;
      if (waitMs > 0) {
        return waitMs;
      }
    }
  }

  return Math.min(BASE_RETRY_MS * 2 ** attempt, 120000);
}

function isRetryable(status, bodyText) {
  if (status === 429) {
    return true;
  }

  if (status >= 500 && status <= 599) {
    return true;
  }

  return status === 403 && /secondary rate limit/i.test(bodyText);
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function githubRequest(url, options = {}, attempt = 0) {
  const response = await fetch(url, options);

  if (response.ok) {
    return parseResponse(response);
  }

  const bodyText = await response.text();
  if (attempt < MAX_RETRIES && isRetryable(response.status, bodyText)) {
    const delayMs = parseRetryDelayMs(response, attempt);
    console.log(`Request throttled (${response.status}). Sleeping ${delayMs}ms before retry ${attempt + 1}/${MAX_RETRIES}...`);
    await sleep(delayMs);
    return githubRequest(url, options, attempt + 1);
  }

  const error = new Error(`GitHub API request failed: ${response.status} ${response.statusText} ${bodyText}`);
  error.status = response.status;
  throw error;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function listReleaseFiles() {
  const entries = await fs.readdir(process.cwd(), { withFileTypes: true });
  const allowedExtensions = new Set(['.json', '.tl', '.dat']);

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => allowedExtensions.has(path.extname(name)))
    .sort((a, b) => a.localeCompare(b));
}

function getContentType(fileName) {
  const ext = path.extname(fileName);
  if (ext === '.json') {
    return 'application/json';
  }
  if (ext === '.dat') {
    return 'application/octet-stream';
  }
  return 'text/plain; charset=utf-8';
}

async function main() {
  const repository = getRequiredEnv('GITHUB_REPOSITORY');
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN (or GH_TOKEN) environment variable');
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  }

  const apiHeaders = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };

  const tagUrl = `${API_BASE}/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(RELEASE_TAG)}`;
  let release;

  try {
    release = await githubRequest(tagUrl, { headers: apiHeaders });
    console.log(`Using existing release for tag ${RELEASE_TAG} (id: ${release.id}).`);
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    console.log(`Release for tag ${RELEASE_TAG} not found, creating it...`);
    release = await githubRequest(`${API_BASE}/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      headers: {
        ...apiHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tag_name: RELEASE_TAG,
        name: RELEASE_TAG,
        draft: false,
        prerelease: false,
        target_commitish: process.env.GITHUB_SHA
      })
    });
  }

  const files = await listReleaseFiles();
  if (!files.length) {
    console.log('No matching release files found (*.json, *.tl, *.dat).');
    return;
  }

  console.log(`Preparing to upload ${files.length} files.`);

  const existingAssets = new Map((release.assets || []).map((asset) => [asset.name, asset]));
  const uploadBaseUrl = release.upload_url.replace('{?name,label}', '');

  for (const fileName of files) {
    const existingAsset = existingAssets.get(fileName);
    if (existingAsset) {
      console.log(`Deleting existing asset ${fileName} (id: ${existingAsset.id}).`);
      await githubRequest(`${API_BASE}/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
        method: 'DELETE',
        headers: apiHeaders
      });
    }

    const content = await fs.readFile(path.join(process.cwd(), fileName));
    const uploadUrl = `${uploadBaseUrl}?name=${encodeURIComponent(fileName)}`;

    console.log(`Uploading ${fileName}...`);
    await githubRequest(uploadUrl, {
      method: 'POST',
      headers: {
        ...apiHeaders,
        'Content-Type': getContentType(fileName),
        'Content-Length': String(content.length)
      },
      body: content
    });

    await sleep(UPLOAD_DELAY_MS);
  }

  console.log(`Release ${RELEASE_TAG} updated successfully with ${files.length} assets.`);
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
