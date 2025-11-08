(grammar
  (rules
    ; ============================================================================
    ; ROOT & PROGRAM STRUCTURE
    ; ============================================================================

    (Root
      ("" ["program"])
      (LineList ["program", ...1])
    )

    ; Fixed: Removed left recursion - LineList now builds list via tail
    (LineList
      (Line LineListTail [1, ...2])
    )
    (LineListTail
      (EOL Line LineListTail [2, ...3])
      (EOL [])
      ("" [])
    )

    (Line
      (LevelLine 1)
      (FormalLine 1)
      (COMMENT ["comment", 1.value])
      ("" null)
    )

    ; Fixed: Major refactor - eliminated 52 common prefix conflicts
    ; Now uses factored dispatch based on first token
    (LevelLine
      (DotLevel DotLevelBody)
      (LABEL LabelBody)
      (LabelSpace IndentBody)
    )

    (DotLevelBody
      (Spaces SpacesThenLineOrComment ["do-line", null, 1, 3])
      (LineBody ["do-line", null, 1, 2])
      (COMMENT ["do-line", null, 1, ["comment", 2.value]])
      ("" ["do-line", null, 1, null])
    )

    (SpacesThenLineOrComment
      (LineBody 1)
      (COMMENT ["comment", 1.value])
    )

    (LabelBody
      (LabelSpace LabelSpaceBody ["line", 1.value, ...2])
      (COMMENT ["line", 1.value, ["comment", 2.value]])
      ("" ["line", 1.value, null])
    )

    (LabelSpaceBody
      (DotLevel DotLevelWithLabel)
      (LineBody 2)
      (COMMENT ["comment", 3.value])
    )

    (DotLevelWithLabel
      (Spaces LineBody [3, 5])
      (LineBody [3, 4])
      (Spaces COMMENT [3, ["comment", 5.value]])
      (COMMENT [3, ["comment", 4.value]])
      ("" [3, null])
    )

    (IndentBody
      (DotLevel IndentDotLevel ["do-line", null, 2, ...3])
      (LineBody ["line", null, 2])
      (COMMENT ["line", null, ["comment", 2.value]])
    )

    (IndentDotLevel
      (Spaces LineBody [null, 4])
      ("" [null, null])
    )

    (FormalLine
      (LABEL FormalList LabelSpace LineBody ["line-params", 1.value, 2, 4])
      (LABEL FormalList LabelSpace COMMENT ["line-params", 1.value, 2, ["comment", 4.value]])
      (LABEL FormalList COMMENT ["line-params", 1.value, 2, ["comment", 3.value]])
      (LABEL FormalList ["line-params", 1.value, 2, null])
    )

    (FormalList
      (LPAREN ParamList RPAREN 2)
      (LPAREN RPAREN [])
    )

    ; Fixed: Removed left recursion
    (ParamList
      (IDENTIFIER ParamListTail [1.value, ...2])
    )
    (ParamListTail
      (COMMA IDENTIFIER ParamListTail [2.value, ...3])
      ("" [])
    )

    (LabelSpace
      (SPACE 1)
      (SPACES 1)
      (TAB 1)
    )

    ; Fixed: Removed left recursion from sequence pattern
    (DotLevel
      (DOT_LEVEL 1.value)
      (DOT DotLevelTail [1, ...2])
    )
    (DotLevelTail
      (DOT DotLevelTail [$1 + 1, ...2])
      ("" [])
    )

    (Spaces
      (SPACE 1)
      (SPACES 1)
    )

    (LineBody
      (Commands OptTrailing [1, ...2])
    )

    ; Helper for optional trailing spaces/comments
    (OptTrailing
      (Spaces OptComment [null, ...2])
      (COMMENT [["comment", 1.value]])
      ("" [])
    )

    (OptComment
      (COMMENT [["comment", 1.value]])
      ("" [])
    )

    ; Fixed: Removed left recursion - Commands now right-recursive
    (Commands
      (Command CommandsTail [1, ...2])
    )
    (CommandsTail
      (Spaces Command CommandsTail [2, ...3])
      ("" [])
    )

    ; ============================================================================
    ; COMMANDS (All command productions remain the same)
    ; ============================================================================

    (Command
      (BREAK   OptPostcond OptArgSpace BreakArgs ["break"  , 2, 4])
      (CLOSE   OptPostcond OptArgSpace CloseArgs ["close"  , 2, 4])
      (DO      OptPostcond OptArgSpace DoArgs ["do"     , 2, 4])
      (ELSE                OptArgSpace ElseArgs ["else"   , 2])
      (FOR                 OptArgSpace ForArgs ["for"    , 2])
      (GOTO    OptPostcond OptArgSpace GotoArgs ["goto"   , 2, 4])
      (HALT    OptPostcond OptArgSpace HaltArgs ["halt"   , 2, 4])
      (HANG    OptPostcond OptArgSpace HangArgs ["hang"   , 2, 4])
      (IF                  OptArgSpace IfArgs ["if"     , 2])
      (JOB     OptPostcond OptArgSpace JobArgs ["job"    , 2, 4])
      (KILL    OptPostcond OptArgSpace KillArgs ["kill"   , 2, 4])
      (LOCK    OptPostcond OptArgSpace LockArgs ["lock"   , 2, 4])
      (MERGE   OptPostcond OptArgSpace MergeArgs ["merge"  , 2, 4])
      (NEW     OptPostcond OptArgSpace NewArgs ["new"    , 2, 4])
      (OPEN    OptPostcond OptArgSpace OpenArgs ["open"   , 2, 4])
      (QUIT    OptPostcond OptArgSpace QuitArgs ["quit"   , 2, 4])
      (READ    OptPostcond OptArgSpace ReadArgs ["read"   , 2, 4])
      (SET     OptPostcond OptArgSpace SetArgs ["set"    , 2, 4])
      (TCOMMIT OptPostcond OptArgSpace TCommitArgs ["tcommit", 2, 4])
      (TSTART  OptPostcond OptArgSpace TStartArgs ["tstart" , 2, 4])
      (USE     OptPostcond OptArgSpace UseArgs ["use"    , 2, 4])
      (VIEW    OptPostcond OptArgSpace ViewArgs ["view"   , 2, 4])
      (WRITE   OptPostcond OptArgSpace WriteArgs ["write"  , 2, 4])
      (XECUTE  OptPostcond OptArgSpace XecuteArgs ["xecute" , 2, 4])
    )

    (OptPostcond
      (POSTCOND_START Expression 2)
      ("" null)
    )

    (OptArgSpace
      (SPACE 1)
      ("" null)
    )

    ; ============================================================================
    ; COMMAND ARGUMENTS (Fixed left recursion in all list patterns)
    ; ============================================================================

    (BreakArgs
      (BreakArgList 1)
      ("" null)
    )
    (BreakArgList
      (BreakArg BreakArgListTail [1, ...2])
    )
    (BreakArgListTail
      (COMMA BreakArg BreakArgListTail [2, ...3])
      ("" [])
    )
    (BreakArg
      (Expression COLON Expression ["break-cond", 1, 3])
      (Expression 1)
    )

    (CloseArgs
      (CloseArgList 1)
      ("" null)
    )
    (CloseArgList
      (Expression CloseArgListTail [1, ...2])
    )
    (CloseArgListTail
      (COMMA Expression CloseArgListTail [2, ...3])
      ("" [])
    )

    (DoArgs
      (DoArgList 1)
      (Commands 1)
      ("" null)
    )
    (DoArgList
      (DoArg DoArgListTail [1, ...2])
    )
    (DoArgListTail
      (COMMA DoArg DoArgListTail [2, ...3])
      ("" [])
    )
    (DoArg
      (EntryRef ActualList COLON Expression ["call-cond", 1, 2, 4])
      (EntryRef ActualList ["call", 1, 2])
      (EntryRef COLON Expression ["do-cond", 1, 3])
      (EntryRef 1)
      (INDIRECTION Expression COLON Expression ["do-indirect-cond", 2, 4])
      (INDIRECTION Expression ["do-indirect", 2])
    )

    (ElseArgs
      (Commands OptTrailing [1, ...2])
      ("" null)
    )

    (ForArgs
      (LVN EQUALS ForParamList ForInline [1, 3, ...4])
      (Commands OptTrailing [1, ...2])
      ("" null)
    )
    (ForInline
      (Spaces Commands OptTrailing [2, ...3])
      ("" [])
    )

    (ForParamList
      (ForParam ForParamListTail [1, ...2])
    )
    (ForParamListTail
      (COMMA ForParam ForParamListTail [2, ...3])
      ("" [])
    )
    (ForParam
      (Expression COLON Expression COLON Expression ["range", 1, 3, 5])
      (Expression COLON Expression ["range", 1, 3, ["num", "1"]])
      (Expression ["value", 1])
    )

    (GotoArgs
      (GotoArgList 1)
      ("" null)
    )
    (GotoArgList
      (GotoArg GotoArgListTail [1, ...2])
    )
    (GotoArgListTail
      (COMMA GotoArg GotoArgListTail [2, ...3])
      ("" [])
    )
    (GotoArg
      (EntryRef COLON Expression ["goto-cond", 1, 3])
      (EntryRef 1)
      (INDIRECTION Expression ["goto-indirect", 2])
    )

    (HaltArgs
      ("" null)
    )

    (HangArgs
      (HangArgList 1)
      ("" null)
    )
    (HangArgList
      (Expression HangArgListTail [1, ...2])
      (INDIRECTION Expression ["hang-indirect", 2])
    )
    (HangArgListTail
      (COMMA Expression HangArgListTail [2, ...3])
      ("" [])
    )

    (IfArgs
      (IfArgList IfInline [1, ...2])
      ("" null)
    )
    (IfInline
      (Spaces Commands OptTrailing ["if-then", 3, ...4])
      (Spaces OptComment [...2])
      (COMMENT [["comment", 2.value]])
      ("" [])
    )

    (IfArgList
      (Expression IfArgListTail [1, ...2])
      (INDIRECTION Expression ["if-indirect", 2])
    )
    (IfArgListTail
      (COMMA Expression IfArgListTail [2, ...3])
      ("" [])
    )

    (JobArgs
      (JobArgList 1)
      ("" null)
    )
    (JobArgList
      (EntryRef COLON ActualList JobArgSuffix [1, 3, ...4])
      (Expression JobArgListTail [1, ...2])
    )
    (JobArgSuffix
      (COLON LPAREN DeviceParams RPAREN COLON Expression ["job-full", 6, 9])
      (COLON Expression COLON Expression ["job-params-dev-timeout", 5, 7])
      (COLON Expression ["job-params-timeout", 5])
      ("" ["job-params"])
    )
    (JobArgListTail
      (COMMA Expression JobArgListTail [2, ...3])
      ("" [])
    )

    (KillArgs
      (KillArgList 1)
      ("" null)
    )
    (KillArgList
      (KillArg KillArgListTail [1, ...2])
      (LPAREN NameList RPAREN ["kill-except", 2])
    )
    (KillArgListTail
      (COMMA KillArg KillArgListTail [2, ...3])
      ("" [])
    )
    (KillArg
      (GLVN 1)
      (INDIRECTION Expression ["kill-indirect", 2])
    )

    (NameList
      (IDENTIFIER NameListTail [1.value, ...2])
    )
    (NameListTail
      (COMMA IDENTIFIER NameListTail [2.value, ...3])
      ("" [])
    )

    (LockArgs
      (LockArgList 1)
      ("" null)
    )
    (LockArgList
      (LockArg LockArgListTail [1, ...2])
      (LPAREN LockMultiList RPAREN ["lock-multi", 2])
    )
    (LockArgListTail
      (COMMA LockArg LockArgListTail [2, ...3])
      ("" [])
    )
    (LockMultiList
      (NRef LockMultiListTail [1, ...2])
    )
    (LockMultiListTail
      (COMMA NRef LockMultiListTail [2, ...3])
      ("" [])
    )
    (LockArg
      (PLUS NRef COLON Expression ["lock-incr", 2, 4])
      (PLUS NRef ["lock-incr", 2])
      (MINUS NRef COLON Expression ["lock-decr", 2, 4])
      (MINUS NRef ["lock-decr", 2])
      (NRef COLON Expression ["lock-timeout", 1, 3])
      (NRef ["lock-var", 1])
      (INDIRECTION Expression ["lock-indirect", 2])
    )

    (NRef
      (GLVN 1)
    )

    (MergeArgs
      (MergeArgList 1)
      ("" null)
    )
    (MergeArgList
      (GLVN EQUALS GLVN MergeArgListTail ["=", 1, 3, ...4])
      (INDIRECTION Expression ["merge-indirect", 2])
    )
    (MergeArgListTail
      (COMMA GLVN EQUALS GLVN MergeArgListTail [["=", 2, 4], ...5])
      ("" [])
    )

    (NewArgs
      (NewArgList 1)
      ("" null)
    )
    (NewArgList
      (NewArg NewArgListTail [1, ...2])
      (LPAREN NameList RPAREN ["new-except", 2])
    )
    (NewArgListTail
      (COMMA NewArg NewArgListTail [2, ...3])
      ("" [])
    )
    (NewArg
      (IDENTIFIER 1.value)
      (INDIRECTION Expression ["new-indirect", 2])
    )

    (OpenArgs
      (OpenArgList 1)
      ("" null)
    )
    (OpenArgList
      (Expression OpenArgSuffix [1, ...2])
    )
    (OpenArgSuffix
      (COLON LPAREN DeviceParams RPAREN OpenTimeout ["open-params", 4, ...6])
      (COLON Expression OpenArgListTail ["open-timeout", 2, ...3])
      (OpenArgListTail 1)
    )
    (OpenTimeout
      (COLON Expression [6])
      ("" [])
    )
    (OpenArgListTail
      (COMMA Expression OpenArgSuffix [2, ...3])
      ("" [])
    )

    (DeviceParams
      (Expression DeviceParamsTail [1, ...2])
    )
    (DeviceParamsTail
      (COLON Expression DeviceParamsTail [2, ...3])
      ("" [])
    )

    (QuitArgs
      (Expression 1)
      (INDIRECTION Expression ["quit-indirect", 2])
      ("" null)
    )

    (ReadArgs
      (ReadArgList 1)
      ("" null)
    )
    (ReadArgList
      (ReadArg ReadArgListTail [1, ...2])
    )
    (ReadArgListTail
      (COMMA ReadArg ReadArgListTail [2, ...3])
      (ReadArg ReadArgListTail [1, ...2])
      ("" [])
    )
    (ReadArg
      (MULTIPLY GLVN COLON Expression ["read-char-timeout", 2, 4])
      (MULTIPLY GLVN ["read-char", 2])
      (GLVN MODULO Expression COLON Expression ["read-max-timeout", 1, 3, 5])
      (GLVN MODULO Expression ["read-max", 1, 3])
      (GLVN COLON Expression ["read-timeout", 1, 3])
      (GLVN ["read-var", 1])
      (MODULO Expression ["read-max-only", 2])
      (Expression 1)
      (OR ["read-newline"])
      (INDIRECTION Expression ["read-indirect", 2])
    )

    (SetArgs
      (SetArgList 1)
      ("" null)
    )
    (SetArgList
      (SetArg SetArgListTail [1, ...2])
    )
    (SetArgListTail
      (COMMA SetArg SetArgListTail [2, ...3])
      ("" [])
    )
    (SetArg
      (SetDestination EQUALS Expression ["=", 1, 3])
      (INDIRECTION ExprAtom EQUALS Expression ["assign-indirect", 2, 4])
      (INDIRECTION ExprAtom ["assign-indirect-expr", 2])
    )

    (SetDestination
      (SetLeft 1)
      (LPAREN SetLeftList RPAREN ["multi-set", 2])
    )

    (SetLeftList
      (SetLeft SetLeftListTail [1, ...2])
    )
    (SetLeftListTail
      (COMMA SetLeft SetLeftListTail [2, ...3])
      ("" [])
    )

    (SetLeft
      (LeftRestricted 1)
      (LeftExpr 1)
      (GLVN 1)
    )

    (LeftRestricted
      (INTRINSIC ["ssvn", 1.value])
    )

    (LeftExpr
      (SetPiece 1)
      (SetExtract 1)
    )

    (SetPiece
      (INTRINSIC LPAREN GLVN COMMA Expression RPAREN ["$piece-set", 1.value, 3, 5])
      (INTRINSIC LPAREN GLVN COMMA Expression COMMA Expression RPAREN ["$piece-set", 1.value, 3, 5, 7])
      (INTRINSIC LPAREN GLVN COMMA Expression COMMA Expression COMMA Expression RPAREN ["$piece-set", 1.value, 3, 5, 7, 9])
    )

    (SetExtract
      (INTRINSIC LPAREN GLVN RPAREN ["$extract-set", 1.value, 3])
      (INTRINSIC LPAREN GLVN COMMA Expression RPAREN ["$extract-set", 1.value, 3, 5])
      (INTRINSIC LPAREN GLVN COMMA Expression COMMA Expression RPAREN ["$extract-set", 1.value, 3, 5, 7])
    )

    (TCommitArgs
      ("" null)
    )

    (TStartArgs
      (LPAREN RPAREN ["no-vars"])
      (Expression 1)
      ("" null)
    )

    (UseArgs
      (UseArgList 1)
      ("" null)
    )
    (UseArgList
      (Expression UseArgListTail [1, ...2])
    )
    (UseArgListTail
      (COMMA Expression UseArgListTail [2, ...3])
      ("" [])
    )

    (ViewArgs
      (ViewArgList 1)
      ("" null)
    )
    (ViewArgList
      (ViewArg ViewArgListTail [1, ...2])
    )
    (ViewArgListTail
      (COMMA ViewArg ViewArgListTail [2, ...3])
      ("" [])
    )
    (ViewArg
      (Expression ColonExprList [1, ...2])
      (Expression 1)
      (INDIRECTION Expression ["view-indirect", 2])
    )

    (ColonExprList
      (COLON Expression ColonExprListTail [2, ...3])
    )
    (ColonExprListTail
      (COLON Expression ColonExprListTail [2, ...3])
      ("" [])
    )

    (WriteArgs
      (WriteArgList 1)
      ("" null)
    )
    (WriteArgList
      (WriteArg WriteArgListTail [1, ...2])
    )
    (WriteArgListTail
      (COMMA WriteArg WriteArgListTail [2, ...3])
      (WriteArg WriteArgListTail [1, ...2])
      ("" [])
    )
    (WriteArg
      (OR ["newline"])
      (MODULO ["formfeed"])
      (PATTERN_MATCH Expression ["tab", 2])
      (MULTIPLY Expression ["ascii", 2])
      (INDIRECTION Expression ["write-indirect", 2])
      (Expression 1)
    )

    (XecuteArgs
      (XecuteArgList 1)
      ("" null)
    )
    (XecuteArgList
      (XecuteArg XecuteArgListTail [1, ...2])
    )
    (XecuteArgListTail
      (COMMA XecuteArg XecuteArgListTail [2, ...3])
      ("" [])
    )
    (XecuteArg
      (Expression COLON Expression ["xecute-cond", 1, 3])
      (Expression 1)
      (INDIRECTION Expression ["xecute-indirect", 2])
    )

    ; ============================================================================
    ; EXPRESSIONS
    ; ============================================================================
    ; Note: Binary operators kept in left-recursive form.
    ; Generator should recognize pattern and produce iterative loops.
    ; This preserves clarity of precedence hierarchy.

    (Expression
      (OrExpr 1)
    )

    ; LEFT-RECURSIVE: Generator should produce while-loop
    (OrExpr
      (AndExpr 1)
      (OrExpr OR AndExpr ["!", 1, 3])
    )

    ; LEFT-RECURSIVE: Generator should produce while-loop
    (AndExpr
      (CompareExpr 1)
      (AndExpr AND CompareExpr ["&", 1, 3])
    )

    ; LEFT-RECURSIVE: Generator should produce non-associative comparison
    ; (only one comparison operator per expression)
    (CompareExpr
      (ConcatExpr 1)
      (CompareExpr EQUALS ConcatExpr ["=", 1, 3])
      (CompareExpr LESS ConcatExpr ["<", 1, 3])
      (CompareExpr GREATER ConcatExpr [">", 1, 3])
      (CompareExpr CONTAINS ConcatExpr ["[", 1, 3])
      (CompareExpr FOLLOWS ConcatExpr ["]", 1, 3])
      (CompareExpr SORTS_AFTER ConcatExpr ["]]", 1, 3])
      (CompareExpr NOT_COMPARE ConcatExpr ["'", 2.value, 1, 3])
      (CompareExpr PATTERN_MATCH Pattern ["?", 1, 3])
      (CompareExpr NOT_PATTERN_MATCH Pattern ["'?", 1, 3])
      (CompareExpr PATTERN_INDIRECT Expression ["?@", 1, 3])
      (CompareExpr NOT_PATTERN_INDIRECT Expression ["'?@", 1, 3])
    )

    ; LEFT-RECURSIVE: Generator should produce while-loop
    (ConcatExpr
      (AddExpr 1)
      (ConcatExpr CONCAT AddExpr ["_", 1, 3])
    )

    ; LEFT-RECURSIVE: Generator should produce while-loop
    (AddExpr
      (MulExpr 1)
      (AddExpr PLUS MulExpr ["+", 1, 3])
      (AddExpr MINUS MulExpr ["-", 1, 3])
    )

    ; LEFT-RECURSIVE: Generator should produce while-loop
    (MulExpr
      (PowExpr 1)
      (MulExpr MULTIPLY PowExpr ["*", 1, 3])
      (MulExpr DIVIDE PowExpr ["/", 1, 3])
      (MulExpr INT_DIVIDE PowExpr ["\\", 1, 3])
      (MulExpr MODULO PowExpr ["#", 1, 3])
    )

    ; RIGHT-RECURSIVE: This is correct for right-associative power
    (PowExpr
      (UnaryExpr 1)
      (UnaryExpr POWER PowExpr ["**", 1, 3])
    )

    (UnaryExpr
      (ExprAtom 1)
      (PLUS UnaryExpr ["+", 2])
      (MINUS UnaryExpr ["-", 2])
      (NOT UnaryExpr ["'", 2])
    )

    (ExprAtom
      (Number ["num", 1.value])
      (StrLit 1)
      (GLVN 1)
      (FunctionCall 1)
      (ExFunc 1)
      (SVN 1)
      (LPAREN Expression RPAREN 2)
      (INDIRECTION ExprAtom ["@", 2])
      (INDIRECTION INDIRECTION ExprAtom ["@@", 3])
    )

    (Number
      (INTEGER ["num", 1.value])
      (REAL ["num", 1.value])
    )

    (StrLit
      (STRING ["str", 1.value])
    )

    ; ============================================================================
    ; VARIABLES & REFERENCES
    ; ============================================================================

    (GLVN
      (LVN 1)
      (GVN 1)
      (SVN 1)
    )

    (LVN
      (IDENTIFIER ["var", 1.value])
      (IDENTIFIER LPAREN ExprList RPAREN ["var", 1.value, ...3])
      (INDIRECTION ExprAtom INDIRECTION LPAREN ExprList RPAREN INDIRECTION LPAREN ExprList RPAREN ["@-subs-chain", 2, ...5, ...9])
      (INDIRECTION ExprAtom INDIRECTION LPAREN ExprList RPAREN ["@-subs", 2, ...5])
      (INDIRECTION ExprAtom ["@", 2])
    )

    (GVN
      (GLOBAL_PREFIX IDENTIFIER ["global", 2.value])
      (GLOBAL_PREFIX IDENTIFIER LPAREN ExprList RPAREN ["global", 2.value, ...4])
      (NAKED_GLOBAL LPAREN ExprList RPAREN ["naked-global", ...3])
      (GLOBAL_PREFIX PIPE Expression PIPE IDENTIFIER ["extended-ref", 3, 5.value])
      (GLOBAL_PREFIX PIPE Expression PIPE IDENTIFIER LPAREN ExprList RPAREN ["extended-ref", 3, 5.value, ...7])
      (GLOBAL_PREFIX PIPE Expression COMMA Expression PIPE IDENTIFIER ["extended-ref-2", 3, 5, 7.value])
      (GLOBAL_PREFIX PIPE Expression COMMA Expression PIPE IDENTIFIER LPAREN ExprList RPAREN ["extended-ref-2", 3, 5, 7.value, ...9])
      (INDIRECTION ExprAtom INDIRECTION LPAREN ExprList RPAREN INDIRECTION LPAREN ExprList RPAREN ["@-subs-chain", 2, ...5, ...9])
      (INDIRECTION ExprAtom INDIRECTION LPAREN ExprList RPAREN ["@-subs", 2, ...5])
      (INDIRECTION ExprAtom ["@", 2])
    )

    (SVN
      (INTRINSIC ["ssvn", 1.value])
      (INTRINSIC LPAREN ExprList RPAREN ["ssvn", 1.value, ...3])
    )

    ; Fixed: ExprList - complex due to select pairs and optional args
    (ExprList
      (Expression ExprListTail [1, ...2])
    )
    (ExprListTail
      (COLON Expression ExprListMore [["select-pair", $1, 2], ...3])
      (COMMA ExprListRest [...2])
      ("" [])
    )
    (ExprListMore
      (COMMA ExprListRest [...2])
      ("" [])
    )
    (ExprListRest
      (Expression ExprListTail [1, ...2])
      (COMMA ExprListRest [null, ...2])
      ("" [])
    )

    ; ============================================================================
    ; FUNCTIONS
    ; ============================================================================

    (FunctionCall
      (TEXT LPAREN TextArgs RPAREN ["intrinsic", 1.value, 3])
      (INTRINSIC LPAREN ExprList RPAREN ["intrinsic", 1.value, ...3])
      (INTRINSIC LPAREN RPAREN ["intrinsic", 1.value])
    )

    (TextArgs
      (EntryRef 1)
      (PLUS Expression ["entryref-offset", 2, null])
    )

    (ExFunc
      (EXTRINSIC EntryRef ActualList ["extrinsic", 2, ...3])
      (EXTRINSIC EntryRef ["extrinsic", 2])
    )

    (ActualList
      (LPAREN ActualArgList RPAREN 2)
      (LPAREN RPAREN [])
    )

    ; Fixed: ActualArgList - handles leading/trailing commas for optional args
    (ActualArgList
      (ActualOrEmpty ActualArgListTail [1, ...2])
      (COMMA ActualRestList [null, ...2])
    )
    (ActualOrEmpty
      (Actual 1)
      ("" null)
    )
    (ActualArgListTail
      (COMMA ActualOrEmpty ActualArgListTail [2, ...3])
      ("" [])
    )
    (ActualRestList
      (Actual ActualArgListTail [1, ...2])
      (COMMA ActualRestList [null, ...2])
      ("" [])
    )

    (Actual
      (Expression 1)
      (DOT IDENTIFIER ["pass-by-ref", 2.value])
      (DOT IDENTIFIER LPAREN ExprList RPAREN ["pass-by-ref", 2.value, ...4])
    )

    (EntryRef
      (LabelName PLUS Expression GLOBAL_PREFIX IDENTIFIER ["entryref", 1, 3, 5.value])
      (LabelName PLUS Expression GLOBAL_PREFIX INDIRECTION ExprAtom ["entryref-indirect", 1, 3, 6])
      (LabelName GLOBAL_PREFIX IDENTIFIER ["entryref", 1, null, 3.value])
      (LabelName GLOBAL_PREFIX INDIRECTION ExprAtom ["entryref-indirect", 1, null, 4])
      (LabelName PLUS Expression ["entryref-local", 1, 3])
      (LabelName ["tag", 1])
      (PLUS Expression GLOBAL_PREFIX IDENTIFIER ["entryref-offset", 2, 4.value])
      (PLUS Expression GLOBAL_PREFIX INDIRECTION ExprAtom ["entryref-offset-indirect", 2, 5])
      (GLOBAL_PREFIX IDENTIFIER ["entryref", null, null, 2.value])
      (GLOBAL_PREFIX INDIRECTION ExprAtom ["entryref-indirect", null, null, 3])
      (INDIRECTION ExprAtom ["@", 2])
    )

    (LabelName
      (IDENTIFIER 1.value)
      (ZDIGITS 1.value)
      (INTEGER 1.value)
    )

    ; ============================================================================
    ; PATTERNS
    ; ============================================================================

    ; Fixed: Removed left recursion from sequence
    (Pattern
      (PatAtom PatternTail [1, ...2])
    )
    (PatternTail
      (PatAtom PatternTail [1, ...2])
      ("" [])
    )

    (PatAtom
      (INTEGER LPAREN PatternAltList RPAREN ["pat-alt-count", 1.value, ...3])
      (LPAREN PatternAltList RPAREN ["pat-alt", ...2])
      (INTEGER INTEGER INTEGER IDENTIFIER ["pat", 1.value + 2.value + 3.value, 4.value])
      (INTEGER INTEGER IDENTIFIER ["pat", 1.value + 2.value, 3.value])
      (INTEGER DOT INTEGER INTEGER IDENTIFIER ["pat-range", 1.value, 2.value + 3.value, 5.value])
      (INTEGER DOT INTEGER IDENTIFIER ["pat-range", 1.value, 3.value, 4.value])
      (INTEGER DOT IDENTIFIER ["pat-min", 1.value, 3.value])
      (DOT INTEGER INTEGER IDENTIFIER ["pat-max", 2.value + 3.value, 4.value])
      (DOT INTEGER IDENTIFIER ["pat-max", 2.value, 3.value])
      (DOT IDENTIFIER ["pat", ".", 2.value])
      (INTEGER IDENTIFIER ["pat", 1.value, 2.value])
      (IDENTIFIER ["pat", 1, 1.value])
      (INTEGER DOT INTEGER INTEGER STRING ["pat-str-range", 1.value, 2.value + 3.value, 5.value])
      (INTEGER DOT INTEGER STRING ["pat-str-range", 1.value, 3.value, 4.value])
      (DOT INTEGER INTEGER STRING ["pat-str-max", 2.value + 3.value, 4.value])
      (DOT INTEGER STRING ["pat-str-max", 2.value, 3.value])
      (INTEGER STRING ["pat-str", 1.value, 2.value])
      (DOT STRING ["pat-str", ".", 2.value])
      (STRING ["pat-str", 1, 1.value])
    )

    ; Fixed: Removed left recursion
    (PatternAltList
      (Pattern PatternAltListTail [1, ...2])
    )
    (PatternAltListTail
      (COMMA Pattern PatternAltListTail [2, ...3])
      ("" [])
    )
  )

  ; ============================================================================
  ; OPERATOR PRECEDENCE (unchanged)
  ; ============================================================================
  (operators
    (left OR)
    (left AND)
    (left NOT)
    (left EQUALS LESS GREATER CONTAINS FOLLOWS SORTS_AFTER NOT_COMPARE)
    (left PATTERN_MATCH NOT_PATTERN_MATCH PATTERN_INDIRECT NOT_PATTERN_INDIRECT)
    (left CONCAT)
    (left PLUS MINUS)
    (left MULTIPLY DIVIDE INT_DIVIDE MODULO)
    (right POWER)
    (left COMMENT)
  )
)
