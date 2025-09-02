// Root
fileReferenceOrigins#45a1a693 db_schema:string db_schema_json:string ctxs:Vector<Origin> skipped:Vector<SkippedOrigin>= FileReferenceOrigins;

origin#24443b33 flags:# predicate:string is_constructor:flags.0?true action:ActionOp stored_constructor:string skipped_flags:Vector<string> needs_parent:flags.3?string parent_is_constructor:flags.4?true = origin;

skippedOrigin#7c62809e flags:# predicate:string is_constructor:flags.0?true why:string = SkippedOrigin;

// Actions
callOp#c2ff3383 method:string args:Vector<TypedOpArg> = ActionOp;
getMessageOp#84b69f70 flags:# peer:TypedOp id:TypedOp from_scheduled:flags.0?TypedOp = ActionOp;

// For string => TypedOp dictionaries
typedOpArg#3a2930c2 key:string value:TypedOp = TypedOpArg;

// Field extraction path
paramNotFlag#acd9d5cf = ParamFlag;
paramIsFlagAbortIfEmpty#f8fe9fee = ParamFlag;
paramIsFlagFallback#202b77a1 fallback:TypedOp = ParamFlag;
paramIsFlagPassthrough#1dc6e17d = ParamFlag;

pathPart#7b8b07d4 flags:# constructor:string param:string flag:ParamFlag = PathPart;

path#0c3586a2 parts:Vector<PathPart> = Path;
pathParent#58f13684 parts:Vector<PathPart> = Path;

// Extractor+storer
extractAndStore#72069549 from:Path to:string = FieldExtractor;

extractInputStickerSetFromDocumentAttributesAndStore#369d8d14 from:Path to:string = FieldExtractor;
extractInputStickerSetFromStickerSetAndStore#c167d470 from:Path to:string = FieldExtractor;

extractPeerIdFromPeerAndStore#7d33019c from:Path to:string = FieldExtractor;
extractPeerIdFromInputPeerAndStore#a51acfb4 from:Path to:string = FieldExtractor;

extractChannelIdFromChannelAndStore#5675bc97 from:Path to:string = FieldExtractor;
extractChannelIdFromInputChannelAndStore#b662660e from:Path to:string = FieldExtractor;

extractUserIdFromUserAndStore#4778ec63 from:Path to:string = FieldExtractor;
extractUserIdFromInputUserAndStore#7720aa2e from:Path to:string = FieldExtractor;

// Typed constructors, the type is specified to simplify codegen,
// but isn't strictly necessary as it can be inferred from the TypedOpOp.
// It is fully pre-validated during the generation of the definition file.
typedOp#705b10ec type:string op:TypedOpOp = TypedOp;

// The actual ops
copyOp#1630c9f5 from:FieldExtractor = TypedOpOp;

getInputChannelByIdOp#3eb8d855 from:FieldExtractor = TypedOpOp;
getInputUserByIdOp#a3a4e6c2 from:FieldExtractor = TypedOpOp;
getInputPeerByIdOp#acfb2a4a from:FieldExtractor = TypedOpOp;

// Literals & constructors (methods not allowed or needed here)
constructorOp#107f8d8a constructor:string args:Vector<TypedOpArg> = TypedOpOp;

vectorOp#f8fb8f72 values:Vector<TypedOp> = TypedOpOp;

intLiteralOp#cbfabe7c value:int = TypedOpOp;
longLiteralOp#d08b8d3a value:long = TypedOpOp;
stringLiteralOp#2b56ea8e value:string = TypedOpOp;
boolLiteralOp#37e07911 value:Bool = TypedOpOp;
doubleLiteralOp#3651e3bf value:double = TypedOpOp;
themeFormatLiteralOp#8e4f9208 = TypedOpOp;
