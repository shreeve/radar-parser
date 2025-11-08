// =============================================================================
// BUMPS Grammar
// =============================================================================
// Direct translation of ISO/IEC 11756:1999 MUMPS + modern extensions
//
// Compile with: bun solar -o src/parser.js src/grammar.js

const grammar = {

  // ===========================================================================
  // Program Structure
  // ===========================================================================

  // routine = routinebody
  // routinebody = line ... eor

  Root: [
    ['', '["program"]'],
    ['LineList', '["program", ...1]'],
  ],

  LineList: [
    ['Line', '[1]'],
    ['LineList EOL Line', '[...1, 3]'],
    ['LineList EOL', '1'],
  ],

  // ===========================================================================
  // Line Types
  // ===========================================================================

  // line = ( levelline | formalline )

  Line: [
    ['LevelLine'],
    ['FormalLine'],
    ['COMMENT', '["comment", 1.value]'],
    ['', 'null'],
  ],

  // levelline = [ label ] ls [ li ] ... linebody
  // ls = ( SPACE | SPACES | TAB )
  // li = "." [ SPACE | SPACES ] ...

  LevelLine: [
    // Dot-level without label or space (. S X=1 or ..S X=1) - FIRST for precedence
    ['DotLevel Spaces LineBody', '["do-line", null, 1, 3]'],
    ['DotLevel LineBody', '["do-line", null, 1, 2]'],  // No space after dots
    ['DotLevel Spaces COMMENT', '["do-line", null, 1, ["comment", 3.value]]'],
    ['DotLevel COMMENT', '["do-line", null, 1, ["comment", 2.value]]'],  // No space after dots
    ['DotLevel', '["do-line", null, 1, null]'],  // Dot alone

    // With label
    ['LABEL LabelSpace LineBody', '["line", 1.value, 3]'],
    ['LABEL LabelSpace DotLevel Spaces LineBody', '["do-line", 1.value, 3, 5]'],
    ['LABEL LabelSpace DotLevel LineBody', '["do-line", 1.value, 3, 4]'],  // No space after dot: TAG .F
    ['LABEL LabelSpace DotLevel Spaces COMMENT', '["do-line", 1.value, 3, ["comment", 5.value]]'],
    ['LABEL LabelSpace DotLevel COMMENT', '["do-line", 1.value, 3, ["comment", 4.value]]'],  // TAG .;
    ['LABEL LabelSpace DotLevel', '["do-line", 1.value, 3, null]'],
    ['LABEL LabelSpace COMMENT', '["line", 1.value, ["comment", 3.value]]'],  // Label with comment, no commands
    ['LABEL COMMENT', '["line", 1.value, ["comment", 2.value]]'],  // Label + comment (no space) - VistA pattern
    ['LABEL', '["line", 1.value, null]'],

    // With label space (indented)
    ['LabelSpace LineBody', '["line", null, 2]'],
    ['LabelSpace DotLevel Spaces LineBody', '["do-line", null, 2, 4]'],
    ['LabelSpace DotLevel', '["do-line", null, 2, null]'],
    ['LabelSpace COMMENT', '["line", null, ["comment", 2.value]]'],  // Indented comment
  ],

  // formalline = label formallist ls linebody
  // formallist = "(" [ L(name) ] ")"

  FormalLine: [
    ['LABEL FormalList LabelSpace LineBody', '["line-params", 1.value, 2, 4]'],
    ['LABEL FormalList LabelSpace COMMENT', '["line-params", 1.value, 2, ["comment", 4.value]]'],
    ['LABEL FormalList COMMENT', '["line-params", 1.value, 2, ["comment", 3.value]]'],  // No space before comment
    ['LABEL FormalList', '["line-params", 1.value, 2, null]'],
  ],

  FormalList: [
    ['LPAREN ParamList RPAREN', '2'],
    ['LPAREN RPAREN', '[]'],
  ],

  ParamList: [
    ['IDENTIFIER', '[1.value]'],
    ['ParamList COMMA IDENTIFIER', '[...1, 3.value]'],
  ],

  // ls = ( SPACE | SPACES | TAB )
  LabelSpace: [
    ['SPACE'],
    ['SPACES'],
    ['TAB'],
  ],

  // li = "." [ SPACE | SPACES ] ...
  // Note: Lexer emits DOT_LEVEL at line start, individual DOT tokens after labels
  DotLevel: [
    ['DOT_LEVEL', '1.value'],  // Multiple dots at line start (counted by lexer)
    ['DOT', '1'],               // Single dot after label
    ['DotLevel DOT', '$1 + 1'],  // Accumulate multiple DOT tokens: .. ... ....
  ],

  Spaces: [
    ['SPACE'],
    ['SPACES'],
  ],

  // linebody = ( commands [ cs [ comment ] ] | comment )
  // Expands to: commands | commands cs | commands cs comment | comment
  LineBody: [
    ['Commands Spaces COMMENT', '[1, ["comment", 3.value]]'],  // commands cs comment
    ['Commands COMMENT', '[1, ["comment", 2.value]]'],  // commands comment (no space)
    ['Commands Spaces', '1'],  // commands cs (trailing space)
    ['Commands', '1'],  // commands alone
  ],

  // ===========================================================================
  // Commands
  // ===========================================================================

  // commands = command [ cs command ] ...
  // cs = ( SPACE | SPACES )

  Commands: [
    ['Command', '[1]'],
    ['Commands Spaces Command', '[...1, 3]'],
  ],

  // command = ( break | close | do | else | for | goto | halt | hang | if
  //           | job | kill | lock | merge | new | open | quit | read | set
  //           | tcommit | tstart | use | view | write | xecute | zcommand )

  // NOTE: Template expansion will go here - one rule per command
  // Pattern: CMDTOKEN OptPostcond OptSpaces CmdArgs → ["cmd", postcond, args]

  Command: [
    ['BREAK   OptPostcond OptArgSpace BreakArgs'  , '["break"  , 2, 4]'],
    ['CLOSE   OptPostcond OptArgSpace CloseArgs'  , '["close"  , 2, 4]'],
    ['DO      OptPostcond OptArgSpace DoArgs'     , '["do"     , 2, 4]'],
    ['ELSE                OptArgSpace ElseArgs'   , '["else"   , 2]'   ],  // ELSE has no postcond
    ['FOR                 OptArgSpace ForArgs'    , '["for"    , 2]'   ],  // FOR has no postcond
    ['GOTO    OptPostcond OptArgSpace GotoArgs'   , '["goto"   , 2, 4]'],
    ['HALT    OptPostcond OptArgSpace HaltArgs'   , '["halt"   , 2, 4]'],
    ['HANG    OptPostcond OptArgSpace HangArgs'   , '["hang"   , 2, 4]'],
    ['IF                  OptArgSpace IfArgs'     , '["if"     , 2]'   ],  // IF has no postcond
    ['JOB     OptPostcond OptArgSpace JobArgs'    , '["job"    , 2, 4]'],
    ['KILL    OptPostcond OptArgSpace KillArgs'   , '["kill"   , 2, 4]'],
    ['LOCK    OptPostcond OptArgSpace LockArgs'   , '["lock"   , 2, 4]'],
    ['MERGE   OptPostcond OptArgSpace MergeArgs'  , '["merge"  , 2, 4]'],
    ['NEW     OptPostcond OptArgSpace NewArgs'    , '["new"    , 2, 4]'],
    ['OPEN    OptPostcond OptArgSpace OpenArgs'   , '["open"   , 2, 4]'],
    ['QUIT    OptPostcond OptArgSpace QuitArgs'   , '["quit"   , 2, 4]'],
    ['READ    OptPostcond OptArgSpace ReadArgs'   , '["read"   , 2, 4]'],
    ['SET     OptPostcond OptArgSpace SetArgs'    , '["set"    , 2, 4]'],
    ['TCOMMIT OptPostcond OptArgSpace TCommitArgs', '["tcommit", 2, 4]'],
    ['TSTART  OptPostcond OptArgSpace TStartArgs' , '["tstart" , 2, 4]'],
    ['USE     OptPostcond OptArgSpace UseArgs'    , '["use"    , 2, 4]'],
    ['VIEW    OptPostcond OptArgSpace ViewArgs'   , '["view"   , 2, 4]'],
    ['WRITE   OptPostcond OptArgSpace WriteArgs'  , '["write"  , 2, 4]'],
    ['XECUTE  OptPostcond OptArgSpace XecuteArgs' , '["xecute" , 2, 4]'],
  ],

  // postcond = [ [ SPACE | SPACES ] ":" tvexpr ]
  // Note: Compiler converts COLON after command to POSTCOND_START token
  // Spaces before colon are consumed by OptSpaces, not part of OptPostcond
  OptPostcond: [
    ['POSTCOND_START Expression', '2'],
    ['', 'null'],
  ],

  // Arg-level spacing: only SPACE (single space), never SPACES
  // This prevents commands from gobbling the SPACES separator between commands
  OptArgSpace: [
    ['SPACE'],
    ['', 'null'],
  ],

  // ===========================================================================
  // Command Arguments (one section per command)
  // ===========================================================================

  // ===== BREAK =====
  // break = "B" [ "REAK" ] postcond ( SPACE L(breakargument) | [ SPACE | SPACES ] )
  // breakargument = expr postcond

  BreakArgs: [
    ['BreakArgList'],
    ['', 'null'],
  ],

  BreakArgList: [
    ['BreakArg', '[1]'],
    ['BreakArgList COMMA BreakArg', '[...1, 3]'],
  ],

  BreakArg: [
    ['Expression COLON Expression', '["break-cond", 1, 3]'],  // Per-arg postcondition
    ['Expression', '1'],
  ],

  // ===== CLOSE =====
  // close = "C" [ "LOSE" ] postcond ( SPACE L(closeargument) | [ SPACE | SPACES ] )
  // closeargument = ( devn [ ":" deviceparameters ] | "@" expratom V L(closeargument) )

  CloseArgs: [
    ['CloseArgList'],
    ['', 'null'],
  ],

  CloseArgList: [
    ['Expression', '[1]'],
    ['CloseArgList COMMA Expression', '[...1, 3]'],
  ],

  // ===== DO =====
  // do = "D" [ "O" ] postcond [ SPACE | SPACES ] ( SPACE L(doargument) | SPACES )
  // doargument = ( entryref postcond | labelref actuallist postcond | "@" expratom V L(doargument) )

  DoArgs: [
    ['DoArgList'],
    ['Commands', '1'],  // Argumentless DO with inline commands: D  W "text"
    ['', 'null'],  // Argumentless DO (no inline)
  ],

  DoArgList: [
    ['DoArg', '[1]'],
    ['DoArgList COMMA DoArg', '[...1, 3]'],
  ],

  DoArg: [
    ['EntryRef ActualList COLON Expression', '["call-cond", 1, 2, 4]'],  // Postcond (no space before :)
    ['EntryRef ActualList', '["call", 1, 2]'],  // No postcond - BEFORE Spaces variant!
    ['EntryRef COLON Expression', '["do-cond", 1, 3]'],  // Postcond (no space)
    ['EntryRef', '1'],  // No postcond, no args
    ['INDIRECTION Expression COLON Expression', '["do-indirect-cond", 2, 4]'],  // Postcond
    ['INDIRECTION Expression', '["do-indirect", 2]'],  // No postcond
  ],

  // ===== ELSE =====
  // else = "E" [ "LSE" ] [ SPACE | SPACES ]

  ElseArgs: [
    ['Commands Spaces COMMENT', '[1, ["comment", 3.value]]'],  // With comment
    ['Commands COMMENT', '[1, ["comment", 2.value]]'],  // No space before comment
    ['Commands', '1'],  // Inline commands
    ['', 'null'],
  ],

  // ===== FOR =====
  // for = "F" [ "OR" ] ( [ SPACE | SPACES ] | ( SPACE lvn "=" L(forparameter) ) )
  // forparameter = ( expr | numexpr ":" numexpr [ ":" numexpr ] )

  ForArgs: [
    ['LVN EQUALS ForParamList Spaces Commands Spaces COMMENT', '[1, 3, 5, ["comment", 7.value]]'],  // With inline + comment
    ['LVN EQUALS ForParamList Spaces Commands COMMENT', '[1, 3, 5, ["comment", 6.value]]'],
    ['LVN EQUALS ForParamList Spaces Commands', '[1, 3, 5]'],  // With inline commands
    ['LVN EQUALS ForParamList', '[1, 3]'],
    ['Commands Spaces COMMENT', '[1, ["comment", 3.value]]'],  // Argumentless FOR + inline + comment
    ['Commands COMMENT', '[1, ["comment", 2.value]]'],  // No space before comment
    ['Commands', '1'],  // Argumentless FOR + inline commands (Spaces consumed by OptSpaces)
    ['', 'null'],  // Argumentless FOR
  ],

  ForParamList: [
    ['ForParam', '[1]'],
    ['ForParamList COMMA ForParam', '[...1, 3]'],
  ],

  ForParam: [
    ['Expression COLON Expression COLON Expression', '["range", 1, 3, 5]'],
    ['Expression COLON Expression', '["range", 1, 3, ["num", "1"]]'],  // Step defaults to 1
    ['Expression', '["value", 1]'],
  ],

  // ===== GOTO =====
  // goto = "G" [ "OTO" ] postcond ( SPACE L(gotoargument) | [ SPACE | SPACES ] )
  // gotoargument = ( entryref postcond | "@" expratom V L(gotoargument) )

  GotoArgs: [
    ['GotoArgList'],
    ['', 'null'],
  ],

  GotoArgList: [
    ['GotoArg', '[1]'],
    ['GotoArgList COMMA GotoArg', '[...1, 3]'],
  ],

  GotoArg: [
    ['EntryRef COLON Expression', '["goto-cond", 1, 3]'],  // Per-arg postcondition
    ['EntryRef', '1'],
    ['INDIRECTION Expression', '["goto-indirect", 2]'],
  ],

  // ===== HALT =====
  // halt = "H" [ "ALT" ] postcond [ SPACE | SPACES ]

  HaltArgs: [
    ['', 'null'],
  ],

  // ===== HANG =====
  // hang = "H" [ "ANG" ] postcond ( SPACE L(hangargument) | [ SPACE | SPACES ] )
  // hangargument = ( numexpr | "@" expratom V L(hangargument) )

  HangArgs: [
    ['HangArgList'],
    ['', 'null'],
  ],

  HangArgList: [
    ['Expression', '[1]'],
    ['HangArgList COMMA Expression', '[...1, 3]'],
    ['INDIRECTION Expression', '["hang-indirect", 2]'],
  ],

  // ===== IF =====
  // if = "I" [ "F" ] ( [ SPACE | SPACES ] | ( SPACE L(ifargument) ) )
  // ifargument = ( tvexpr | "@" expratom V L(ifargument) )

  IfArgs: [
    ['IfArgList Spaces Commands Spaces COMMENT', '["if-then", 1, 3, ["comment", 5.value]]'],  // With comment
    ['IfArgList Spaces Commands COMMENT', '["if-then", 1, 3, ["comment", 4.value]]'],  // No space before comment
    ['IfArgList Spaces Commands', '["if-then", 1, 3]'],  // IF conds inline-cmd
    ['IfArgList Spaces COMMENT', '[1, ["comment", 3.value]]'],  // Conditions + comment (no inline)
    ['IfArgList COMMENT', '[1, ["comment", 2.value]]'],  // No space before comment
    ['IfArgList', '1'],
    ['', 'null'],  // Argumentless IF (tests $TEST)
  ],

  IfArgList: [
    ['Expression', '[1]'],
    ['IfArgList COMMA Expression', '[...1, 3]'],
    ['INDIRECTION Expression', '["if-indirect", 2]'],
  ],

  // ===== JOB =====
  // job = "J" [ "OB" ] postcond ( SPACE L(jobargument) | [ SPACE | SPACES ] )

  JobArgs: [
    ['JobArgList'],
    ['', 'null'],
  ],

  JobArgList: [
    ['EntryRef COLON ActualList COLON LPAREN DeviceParams RPAREN COLON Expression', '["job-full", 1, 3, 6, 9]'],  // entryref:(params):(deviceparams):timeout
    ['EntryRef COLON ActualList COLON Expression COLON Expression', '["job-params-dev-timeout", 1, 3, 5, 7]'],  // entryref:(params):dev:timeout (no parens)
    ['EntryRef COLON ActualList COLON Expression', '["job-params-timeout", 1, 3, 5]'],  // entryref:(params):timeout
    ['EntryRef COLON ActualList', '["job-params", 1, 3]'],  // entryref:(params)
    ['Expression', '[1]'],  // Simple entryref
    ['JobArgList COMMA Expression', '[...1, 3]'],
  ],

  // ===== KILL =====
  // kill = "K" [ "ILL" ] postcond killarglist
  // killarglist = ( [ SPACE | SPACES ] | ( SPACE L(killargument) ) )
  // killargument = ( glvn | "(" L(lname) ")" | "@" expratom V L(killargument) )

  KillArgs: [
    ['KillArgList'],
    ['', 'null'],
  ],

  KillArgList: [
    ['KillArg', '[1]'],
    ['KillArgList COMMA KillArg', '[...1, 3]'],
    ['LPAREN NameList RPAREN', '["kill-except", 2]'],  // Exclusive KILL
  ],

  KillArg: [
    ['GLVN'],
    ['INDIRECTION Expression', '["kill-indirect", 2]'],
  ],

  NameList: [
    ['IDENTIFIER', '[1.value]'],
    ['NameList COMMA IDENTIFIER', '[...1, 3.value]'],
  ],

  // ===== LOCK =====
  // lock = "L" [ "OCK" ] postcond ( [ SPACE | SPACES ] | ( SPACE L(lockargument) ) )
  // lockargument = ( ( [ "+" | "-" ] ( nref | "(" L(nref) ")" ) [ timeout ] ) | "@" expratom V L(lockargument) )

  LockArgs: [
    ['LockArgList'],
    ['', 'null'],  // L (release all)
  ],

  LockArgList: [
    ['LockArg', '[1]'],
    ['LockArgList COMMA LockArg', '[...1, 3]'],
    ['LPAREN LockMultiList RPAREN', '["lock-multi", 2]'],  // L (^A,^B,^C)
  ],

  LockMultiList: [
    ['NRef', '[1]'],
    ['LockMultiList COMMA NRef', '[...1, 3]'],
  ],

  LockArg: [
    ['PLUS NRef COLON Expression', '["lock-incr", 2, 4]'],
    ['PLUS NRef', '["lock-incr", 2]'],
    ['MINUS NRef COLON Expression', '["lock-decr", 2, 4]'],
    ['MINUS NRef', '["lock-decr", 2]'],
    ['NRef COLON Expression', '["lock-timeout", 1, 3]'],
    ['NRef', '["lock-var", 1]'],
    ['INDIRECTION Expression', '["lock-indirect", 2]'],
  ],

  // nref = ( rnref | "@" expratom V nref )
  // rnref = ( [ "^" ] [ VB environment VB ] name [ "(" L(expr) ")" ] | "@" nrefind V "(" L(expr) ")" )

  NRef: [
    ['GLVN'],  // Simplified - GLVN covers all nref cases
  ],

  // ===== MERGE =====
  // merge = "M" [ "ERGE" ] postcond ( SPACE L(mergeargument) | [ SPACE | SPACES ] )
  // mergeargument = ( glvn "=" glvn | "@" expratom V L(mergeargument) )

  MergeArgs: [
    ['MergeArgList'],
    ['', 'null'],
  ],

  MergeArgList: [
    ['GLVN EQUALS GLVN', '["=", 1, 3]'],
    ['MergeArgList COMMA GLVN EQUALS GLVN', '[...1, ["=", 3, 5]]'],
    ['INDIRECTION Expression', '["merge-indirect", 2]'],
  ],

  // ===== NEW =====
  // new = "N" [ "EW" ] postcond ( [ SPACE | SPACES ] | ( SPACE L(newargument) ) )
  // newargument = ( lname | newsvn | "(" L(lname) ")" | "@" expratom V L(newargument) )

  NewArgs: [
    ['NewArgList'],
    ['', 'null'],  // Argumentless NEW (NEW all)
  ],

  NewArgList: [
    ['NewArg', '[1]'],
    ['NewArgList COMMA NewArg', '[...1, 3]'],
    ['LPAREN NameList RPAREN', '["new-except", 2]'],  // Exclusive NEW
  ],

  NewArg: [
    ['IDENTIFIER', '1.value'],
    ['INDIRECTION Expression', '["new-indirect", 2]'],
  ],

  // ===== OPEN =====
  // open = "O" [ "PEN" ] postcond ( SPACE L(openargument) | [ SPACE | SPACES ] )

  OpenArgs: [
    ['OpenArgList'],
    ['', 'null'],
  ],

  OpenArgList: [
    ['Expression COLON LPAREN DeviceParams RPAREN COLON Expression', '["open-params-timeout", 1, 4, 7]'],  // device:(params):timeout
    ['Expression COLON LPAREN DeviceParams RPAREN', '["open-params", 1, 4]'],  // device:(params)
    ['Expression COLON Expression', '["open-timeout", 1, 3]'],  // device:timeout
    ['Expression', '[1]'],  // Simple device
    ['OpenArgList COMMA Expression', '[...1, 3]'],
  ],

  // Device parameters are colon-separated expressions
  DeviceParams: [
    ['Expression', '[1]'],
    ['DeviceParams COLON Expression', '[...1, 3]'],
  ],

  // ===== QUIT =====
  // quit = "Q" [ "UIT" ] postcond ( [ SPACE | SPACES ] | ( SPACE ( expr | "@" expratom V expr ) ) )

  QuitArgs: [
    ['Expression', '1'],
    ['INDIRECTION Expression', '["quit-indirect", 2]'],
    ['', 'null'],
  ],

  // ===== READ =====
  // read = "R" [ "EAD" ] postcond ( SPACE L(readargument) | [ SPACE | SPACES ] )
  // readargument = ( strlit | format | glvn [ readcount ] [ timeout ] | "*" glvn [ timeout ] | "@" expratom V L(readargument) )

  ReadArgs: [
    ['ReadArgList'],
    ['', 'null'],
  ],

  ReadArgList: [
    ['ReadArg', '[1]'],
    ['ReadArgList COMMA ReadArg', '[...1, 3]'],
    ['ReadArgList ReadArg', '[...1, 2]'],  // Format codes don't need comma
  ],

  ReadArg: [
    ['MULTIPLY GLVN COLON Expression', '["read-char-timeout", 2, 4]'],
    ['MULTIPLY GLVN', '["read-char", 2]'],
    ['GLVN MODULO Expression COLON Expression', '["read-max-timeout", 1, 3, 5]'],
    ['GLVN MODULO Expression', '["read-max", 1, 3]'],
    ['GLVN COLON Expression', '["read-timeout", 1, 3]'],
    ['GLVN', '["read-var", 1]'],
    ['MODULO Expression', '["read-max-only", 2]'],  // #10 (max length without variable)
    ['Expression', '1'],  // String prompt or format
    ['OR', '["read-newline"]'],  // !
    ['INDIRECTION Expression', '["read-indirect", 2]'],
  ],

  // ===== SET =====
  // set = "S" [ "ET" ] postcond ( SPACE L(setargument) | [ SPACE | SPACES ] )
  // setargument = ( setdestination "=" expr | "@" expratom V L(setargument) )

  SetArgs: [
    ['SetArgList'],
    ['', 'null'],
  ],

  SetArgList: [
    ['SetArg', '[1]'],
    ['SetArgList COMMA SetArg', '[...1, 3]'],
  ],

  SetArg: [
    ['SetDestination EQUALS Expression', '["=", 1, 3]'],
    ['INDIRECTION ExprAtom EQUALS Expression', '["assign-indirect", 2, 4]'],  // @X=expr
    ['INDIRECTION ExprAtom', '["assign-indirect-expr", 2]'],  // @("X=1") - assignment inside
  ],

  // setdestination = ( setleft | "(" L(setleft) ")" )
  SetDestination: [
    ['SetLeft'],
    ['LPAREN SetLeftList RPAREN', '["multi-set", 2]'],
  ],

  SetLeftList: [
    ['SetLeft', '[1]'],
    ['SetLeftList COMMA SetLeft', '[...1, 3]'],
  ],

  // setleft = ( leftrestricted | leftexpr | glvn )
  SetLeft: [
    ['LeftRestricted'],
    ['LeftExpr'],
    ['GLVN'],
  ],

  // leftrestricted = ( $Device | $Key | $Reference | $X | $Y )
  LeftRestricted: [
    ['INTRINSIC', '["ssvn", 1.value]'],  // $X, $Y, $DEVICE, etc.
  ],

  // leftexpr = ( setpiece | setextract | setev | setqsub )
  LeftExpr: [
    ['SetPiece'],
    ['SetExtract'],
  ],

  // setpiece = $Piece "(" glvn "," expr [ "," intexpr [ "," intexpr ] ] ")"
  SetPiece: [
    ['INTRINSIC LPAREN GLVN COMMA Expression RPAREN', '["$piece-set", 1.value, 3, 5]'],
    ['INTRINSIC LPAREN GLVN COMMA Expression COMMA Expression RPAREN', '["$piece-set", 1.value, 3, 5, 7]'],
    ['INTRINSIC LPAREN GLVN COMMA Expression COMMA Expression COMMA Expression RPAREN', '["$piece-set", 1.value, 3, 5, 7, 9]'],
  ],

  // setextract = $Extract "(" glvn [ "," intexpr [ "," intexpr ] ] ")"
  SetExtract: [
    ['INTRINSIC LPAREN GLVN RPAREN', '["$extract-set", 1.value, 3]'],
    ['INTRINSIC LPAREN GLVN COMMA Expression RPAREN', '["$extract-set", 1.value, 3, 5]'],
    ['INTRINSIC LPAREN GLVN COMMA Expression COMMA Expression RPAREN', '["$extract-set", 1.value, 3, 5, 7]'],
  ],

  // ===== TCOMMIT =====
  TCommitArgs: [
    ['', 'null'],
  ],

  // ===== TSTART =====
  // tstart = "TS" [ "TART" ] postcond ( [ SPACE | SPACES ] | ( SPACE tstartargument ) )

  TStartArgs: [
    ['LPAREN RPAREN', '["no-vars"]'],  // TS ()
    ['Expression', '1'],
    ['', 'null'],
  ],

  // ===== USE =====
  UseArgs: [
    ['UseArgList'],
    ['', 'null'],
  ],

  UseArgList: [
    ['Expression', '[1]'],
    ['UseArgList COMMA Expression', '[...1, 3]'],
  ],

  // ===== VIEW =====
  // view = "V" [ "IEW" ] postcond ( SPACE L(viewargument) | [ SPACE | SPACES ] )
  // viewargument = ( expr [ ":" expr ] ... | "@" expratom V L(viewargument) )

  ViewArgs: [
    ['ViewArgList'],
    ['', 'null'],
  ],

  ViewArgList: [
    ['ViewArg', '[1]'],
    ['ViewArgList COMMA ViewArg', '[...1, 3]'],
  ],

  ViewArg: [
    ['Expression ColonExprList', '[1, ...2]'],
    ['Expression', '1'],
    ['INDIRECTION Expression', '["view-indirect", 2]'],
  ],

  ColonExprList: [
    ['COLON Expression', '[2]'],
    ['ColonExprList COLON Expression', '[...1, 3]'],
  ],

  // ===== WRITE =====
  // write = "W" [ "RITE" ] postcond ( SPACE L(writeargument) | [ SPACE | SPACES ] )
  // writeargument = ( format | expr | "*" intexpr | "@" expratom V L(writeargument) )

  WriteArgs: [
    ['WriteArgList'],
    ['', 'null'],
  ],

  WriteArgList: [
    ['WriteArg', '[1]'],
    ['WriteArgList COMMA WriteArg', '[...1, 3]'],
    ['WriteArgList WriteArg', '[...1, 2]'],  // Format codes don't need comma
  ],

  WriteArg: [
    ['OR'                      , '["newline"]'          ],  // ! (nlformat) - FIRST!
    ['MODULO'                  , '["formfeed"]'         ],  // # (ffformat)
    ['PATTERN_MATCH Expression', '["tab", 2]'           ],  // ?N or ?(expr) (tabformat)
    ['MULTIPLY Expression'     , '["ascii", 2]'         ],  // *N (ascii)
    ['INDIRECTION Expression'  , '["write-indirect", 2]'],  // "@" expratom
    ['Expression'              , '1'                    ],  // expr - LAST!
  ],

  // ===== XECUTE =====
  // xecute = "X" [ "ECUTE" ] postcond ( SPACE L(xargument) | [ SPACE | SPACES ] )
  // xargument = ( expr postcond | "@" expratom V L(xargument) )

  XecuteArgs: [
    ['XecuteArgList'],
    ['', 'null'],
  ],

  XecuteArgList: [
    ['XecuteArg', '[1]'],
    ['XecuteArgList COMMA XecuteArg', '[...1, 3]'],
  ],

  XecuteArg: [
    ['Expression COLON Expression', '["xecute-cond", 1, 3]'],  // Per-arg postcondition
    ['Expression', '1'],
    ['INDIRECTION Expression', '["xecute-indirect", 2]'],
  ],

  // ===========================================================================
  // Expressions
  // ===========================================================================

  // expr = expratom [ exprtail ] ...
  // exprtail = ( ( binaryop | SQ truthop ) expratom ) | ( [ SQ ] QUEST pattern )

  Expression: [
    ['OrExpr'],
  ],

  // Operator precedence (low to high binding)
  // logicalop = ( "&" | "!" | "!!" )

  OrExpr: [
    ['AndExpr'],
    ['OrExpr OR AndExpr', '["!", 1, 3]'],
  ],

  AndExpr: [
    ['CompareExpr'],
    ['AndExpr AND CompareExpr', '["&", 1, 3]'],
  ],

  // relation = ( "=" | "==" | "<" | "<=" | ">" | ">=" | "[" | "]" | "]=" | "]]" | "]]=" )
  // truthop = ( relation | logicalop )

  CompareExpr: [
    ['ConcatExpr'],
    ['CompareExpr EQUALS ConcatExpr', '["=", 1, 3]'],
    ['CompareExpr LESS ConcatExpr', '["<", 1, 3]'],
    ['CompareExpr GREATER ConcatExpr', '[">", 1, 3]'],
    ['CompareExpr CONTAINS ConcatExpr', '["[", 1, 3]'],
    ['CompareExpr FOLLOWS ConcatExpr', '["]", 1, 3]'],
    ['CompareExpr SORTS_AFTER ConcatExpr', '["]]", 1, 3]'],
    ['CompareExpr NOT_COMPARE ConcatExpr', '["\'", 2.value, 1, 3]'],  // '=, '<, etc.
    ['CompareExpr PATTERN_MATCH Pattern', '["?", 1, 3]'],
    ['CompareExpr NOT_PATTERN_MATCH Pattern', '["\'?", 1, 3]'],
    ['CompareExpr PATTERN_INDIRECT Expression', '["?@", 1, 3]'],  // Pattern indirection
    ['CompareExpr NOT_PATTERN_INDIRECT Expression', '["\'?@", 1, 3]'],  // Negated pattern indirection
  ],

  // binaryop includes: CONCAT

  ConcatExpr: [
    ['AddExpr'],
    ['ConcatExpr CONCAT AddExpr', '["_", 1, 3]'],
  ],

  // binaryop includes: "+" | "-"

  AddExpr: [
    ['MulExpr'],
    ['AddExpr PLUS MulExpr', '["+", 1, 3]'],
    ['AddExpr MINUS MulExpr', '["-", 1, 3]'],
  ],

  // binaryop includes: "*" | "/" | "#" | "\\"

  MulExpr: [
    ['PowExpr'],
    ['MulExpr MULTIPLY PowExpr', '["*", 1, 3]'],
    ['MulExpr DIVIDE PowExpr', '["/", 1, 3]'],
    ['MulExpr INT_DIVIDE PowExpr', '["\\\\", 1, 3]'],
    ['MulExpr MODULO PowExpr', '["#", 1, 3]'],
  ],

  // binaryop includes: "**" (right associative)

  PowExpr: [
    ['UnaryExpr'],
    ['UnaryExpr POWER PowExpr', '["**", 1, 3]'],
  ],

  // unaryop = ( SQ | "+" | "-" )

  UnaryExpr: [
    ['ExprAtom'],
    ['PLUS UnaryExpr', '["+", 2]'],
    ['MINUS UnaryExpr', '["-", 2]'],
    ['NOT UnaryExpr', '["\'", 2]'],
  ],

  // ===========================================================================
  // Expression Atoms
  // ===========================================================================

  // expratom = ( glvn | expritem )
  // expritem = ( strlit | numlit | exfunc | svn | function | unaryop expratom | "(" expr ")" )

  ExprAtom: [
    ['Number', '["num", 1.value]'],
    ['StrLit'],
    ['GLVN'],
    ['FunctionCall'],
    ['ExFunc'],
    ['SVN'],
    ['LPAREN Expression RPAREN', '2'],
    ['INDIRECTION ExprAtom', '["@", 2]'],
    ['INDIRECTION INDIRECTION ExprAtom', '["@@", 3]'],  // Double indirection
  ],

  // Number = INTEGER | REAL (numeric values, not labels)
  // Note: ZDIGITS not allowed in expressions (01 is label-only)
  Number: [
    ['INTEGER', '["num", 1.value]'],
    ['REAL', '["num", 1.value]'],
  ],

  StrLit: [
    ['STRING', '["str", 1.value]'],
  ],

  // ===========================================================================
  // Variables - GLVN
  // ===========================================================================

  // glvn = ( lvn | gvn | ssvn )

  GLVN: [
    ['LVN'],
    ['GVN'],
    ['SVN'],
  ],

  // lvn = ( rlvn | "@" expratom V lvn )
  // rlvn = ( name [ "(" L(expr) ")" ] | "@" lnamind "@" "(" L(expr) ")" )

  LVN: [
    ['IDENTIFIER', '["var", 1.value]'],
    ['IDENTIFIER LPAREN ExprList RPAREN', '["var", 1.value, ...3]'],
    ['INDIRECTION ExprAtom INDIRECTION LPAREN ExprList RPAREN INDIRECTION LPAREN ExprList RPAREN', '["@-subs-chain", 2, ...5, ...9]'],  // @X@(I)@(J) - triple indirection
    ['INDIRECTION ExprAtom INDIRECTION LPAREN ExprList RPAREN', '["@-subs", 2, ...5]'],  // @X@(subs)
    ['INDIRECTION ExprAtom', '["@", 2]'],
  ],

  // gvn = ( rgvn | "@" expratom V gvn )
  // rgvn includes naked refs, extended refs, and name indirection

  GVN: [
    ['GLOBAL_PREFIX IDENTIFIER', '["global", 2.value]'],
    ['GLOBAL_PREFIX IDENTIFIER LPAREN ExprList RPAREN', '["global", 2.value, ...4]'],
    ['NAKED_GLOBAL LPAREN ExprList RPAREN', '["naked-global", ...3]'],
    ['GLOBAL_PREFIX PIPE Expression PIPE IDENTIFIER', '["extended-ref", 3, 5.value]'],  // ^|env|name
    ['GLOBAL_PREFIX PIPE Expression PIPE IDENTIFIER LPAREN ExprList RPAREN', '["extended-ref", 3, 5.value, ...7]'],
    ['GLOBAL_PREFIX PIPE Expression COMMA Expression PIPE IDENTIFIER', '["extended-ref-2", 3, 5, 7.value]'],  // ^|env,expr|name
    ['GLOBAL_PREFIX PIPE Expression COMMA Expression PIPE IDENTIFIER LPAREN ExprList RPAREN', '["extended-ref-2", 3, 5, 7.value, ...9]'],
    ['INDIRECTION ExprAtom INDIRECTION LPAREN ExprList RPAREN INDIRECTION LPAREN ExprList RPAREN', '["@-subs-chain", 2, ...5, ...9]'],  // @X@(I)@(J) - triple indirection
    ['INDIRECTION ExprAtom INDIRECTION LPAREN ExprList RPAREN', '["@-subs", 2, ...5]'],  // @X@(subs)
    ['INDIRECTION ExprAtom', '["@", 2]'],
  ],

  // ssvn = ( rssvn | "@" expratom V ssvn )
  // rssvn = ( "^" "$" [ VB environment VB ] ssvname [ "(" L(expr) ")" ] | "@" ssvnamind "@" "(" L(expr) ")" )
  // Note: These are structured special vars like ^$GLOBAL, not $X/$Y

  SVN: [
    ['INTRINSIC', '["ssvn", 1.value]'],  // $X, $Y, $TEST, etc.
    ['INTRINSIC LPAREN ExprList RPAREN', '["ssvn", 1.value, ...3]'],  // $GLOBAL(subs)
  ],

  ExprList: [
    ['Expression COLON Expression', '["select-pair", 1, 3]'],  // $SELECT pair: cond:value - MUST be first!
    ['Expression', '[1]'],
    ['ExprList COMMA Expression COLON Expression', '[...1, ["select-pair", 3, 5]]'],  // $SELECT pair in list
    ['ExprList COMMA Expression', '[...1, 3]'],
    ['ExprList COMMA', '[...1, null]'],  // Empty arg: FUNC(A,,C)
  ],

  // ===========================================================================
  // Functions
  // ===========================================================================

  // function = "$" functionname "(" [ L(expr) ] ")"
  // Special case: $TEXT has unique token type (takes entryref, not expression)

  FunctionCall: [
    ['TEXT LPAREN TextArgs RPAREN', '["intrinsic", 1.value, 3]'],          // $TEXT/$T special
    ['INTRINSIC LPAREN ExprList RPAREN', '["intrinsic", 1.value, ...3]'],  // All others
    ['INTRINSIC LPAREN RPAREN', '["intrinsic", 1.value]'],
  ],

  // $TEXT argument: EntryRef or simple offset (+0)
  TextArgs: [
    ['EntryRef', '1'],                                    // $TEXT(LABEL+2^ROUTINE)
    ['PLUS Expression', '["entryref-offset", 2, null]'],  // $TEXT(+0)
  ],

  // exfunc = "$" "$" labelref [ actuallist ]

  ExFunc: [
    ['EXTRINSIC EntryRef ActualList', '["extrinsic", 2, ...3]'],
    ['EXTRINSIC EntryRef', '["extrinsic", 2]'],  // Argumentless (extrinsic special variable)
  ],

  // actuallist = "(" [ L(actual) ] ")"
  // actual = ( "." actualname | expr )

  ActualList: [
    ['LPAREN ActualArgList RPAREN', '2'],
    ['LPAREN RPAREN', '[]'],
  ],

  ActualArgList: [
    ['Actual', '[1]'],
    ['ActualArgList COMMA Actual', '[...1, 3]'],
    ['ActualArgList COMMA', '[...1, null]'],  // Trailing empty arg: (VAR,)
    ['COMMA ActualArgList', '[null, ...2]'],  // Leading empty arg: (,VAR)
    ['COMMA', '[null]'],  // Single empty arg: (,)
  ],

  Actual: [
    ['Expression', '1'],
    ['DOT IDENTIFIER', '["pass-by-ref", 2.value]'],
    ['DOT IDENTIFIER LPAREN ExprList RPAREN', '["pass-by-ref", 2.value, ...4]'],
  ],

  // ===========================================================================
  // Entry References
  // ===========================================================================

  // entryref = ( dlabel [ "+" intexpr ] [ "^" routineref ] | "+" intexpr "^" routineref | "^" routineref )
  // dlabel = ( label | "@" expratom V L(dlabel) )
  // Note: In argument positions, labels are IDENTIFIER or DIGITS tokens (LABEL only at line start)

  EntryRef: [
    ['LabelName PLUS Expression GLOBAL_PREFIX IDENTIFIER', '["entryref", 1, 3, 5.value]'],
    ['LabelName PLUS Expression GLOBAL_PREFIX INDIRECTION ExprAtom', '["entryref-indirect", 1, 3, 6]'],  // TAG+N^@RTN
    ['LabelName GLOBAL_PREFIX IDENTIFIER', '["entryref", 1, null, 3.value]'],
    ['LabelName GLOBAL_PREFIX INDIRECTION ExprAtom', '["entryref-indirect", 1, null, 4]'],  // TAG^@RTN
    ['LabelName PLUS Expression', '["entryref-local", 1, 3]'],
    ['LabelName', '["tag", 1]'],
    ['PLUS Expression GLOBAL_PREFIX IDENTIFIER', '["entryref-offset", 2, 4.value]'],  // +3^RTN
    ['PLUS Expression GLOBAL_PREFIX INDIRECTION ExprAtom', '["entryref-offset-indirect", 2, 5]'],  // +3^@RTN
    ['GLOBAL_PREFIX IDENTIFIER', '["entryref", null, null, 2.value]'],
    ['GLOBAL_PREFIX INDIRECTION ExprAtom', '["entryref-indirect", null, null, 3]'],  // ^@RTN
    ['INDIRECTION ExprAtom', '["@", 2]'],
  ],

  // labelref = reference to a label in argument position
  // In arguments, label names are IDENTIFIER (text), ZDIGITS (leading zero), or INTEGER (canonical)
  LabelName: [
    ['IDENTIFIER', '1.value'],  // Text label: TAG, FOO
    ['ZDIGITS', '1.value'],     // Numeric label with leading zeros: 01, 002
    ['INTEGER', '1.value'],     // Canonical integer label: 1, 2, 123
  ],

  // ===========================================================================
  // Pattern Matching
  // ===========================================================================

  // pattern = patatom ...

  Pattern: [
    ['PatAtom', '[1]'],
    ['Pattern PatAtom', '[...1, 2]'],
  ],

  // patatom = repcount ( patcode | patstr | alternation )
  // repcount = ( intlit | [ intlit ] "." [ intlit ] )
  // patcode = ( patident | ( OB charspec CB ) )
  // patident = ( A | C | E | L | N | P | U )

  PatAtom: [
    // Alternation (must be before INTEGER IDENTIFIER to avoid ambiguity)
    ['INTEGER LPAREN PatternAltList RPAREN', '["pat-alt-count", 1.value, ...3]'],  // 1(1"A",1"B")
    ['LPAREN PatternAltList RPAREN', '["pat-alt", ...2]'],  // (1"A",1"B")

    // Multi-digit repeat counts (pattern mode tokenizes digit-by-digit)
    ['INTEGER INTEGER INTEGER IDENTIFIER', '["pat", 1.value + 2.value + 3.value, 4.value]'],  // 100N
    ['INTEGER INTEGER IDENTIFIER', '["pat", 1.value + 2.value, 3.value]'],  // 10N

    // Repetition with code
    ['INTEGER DOT INTEGER INTEGER IDENTIFIER', '["pat-range", 1.value, 2.value + 3.value, 5.value]'],  // 1.10N (two-digit max)
    ['INTEGER DOT INTEGER IDENTIFIER', '["pat-range", 1.value, 3.value, 4.value]'],  // 1.3N
    ['INTEGER DOT IDENTIFIER', '["pat-min", 1.value, 3.value]'],  // 1.N
    ['DOT INTEGER INTEGER IDENTIFIER', '["pat-max", 2.value + 3.value, 4.value]'],  // .10N (two-digit max)
    ['DOT INTEGER IDENTIFIER', '["pat-max", 2.value, 3.value]'],  // .5N
    ['DOT IDENTIFIER', '["pat", ".", 2.value]'],  // .N
    ['INTEGER IDENTIFIER', '["pat", 1.value, 2.value]'],  // 1N
    ['IDENTIFIER', '["pat", 1, 1.value]'],  // N

    // String literals
    ['INTEGER DOT INTEGER INTEGER STRING', '["pat-str-range", 1.value, 2.value + 3.value, 5.value]'],  // 1.10"X"
    ['INTEGER DOT INTEGER STRING', '["pat-str-range", 1.value, 3.value, 4.value]'],  // 1.3"X"
    ['DOT INTEGER INTEGER STRING', '["pat-str-max", 2.value + 3.value, 4.value]'],  // .10"-"
    ['DOT INTEGER STRING', '["pat-str-max", 2.value, 3.value]'],  // .1"-"
    ['INTEGER STRING', '["pat-str", 1.value, 2.value]'],  // 1"+"
    ['DOT STRING', '["pat-str", ".", 2.value]'],  // ."+"
    ['STRING', '["pat-str", 1, 1.value]'],  // "+"
  ],

  PatternAltList: [
    ['Pattern', '[1]'],
    ['PatternAltList COMMA Pattern', '[...1, 3]'],
  ],

};

// =============================================================================
// Operator Precedence (Low to High Binding)
// =============================================================================

const operators = [
  ['left', 'OR'],                                                                             // ! (lowest)
  ['left', 'AND'],                                                                            // &
  ['left', 'NOT'],                                                                            // ' (unary)
  ['left', 'EQUALS', 'LESS', 'GREATER', 'CONTAINS', 'FOLLOWS', 'SORTS_AFTER', 'NOT_COMPARE'], // = < > [ ] ]] '= '< etc.
  ['left', 'PATTERN_MATCH', 'NOT_PATTERN_MATCH', 'PATTERN_INDIRECT', 'NOT_PATTERN_INDIRECT'], // ? '? ?@ '?@
  ['left', 'CONCAT'],                                                                         // _
  ['left', 'PLUS', 'MINUS'],                                                                  // + - (binary)
  ['left', 'MULTIPLY', 'DIVIDE', 'INT_DIVIDE', 'MODULO'],                                     // * / \ #
  ['right', 'POWER'],                                                                         // ** (right-associative)
  ['left', 'COMMENT'],                                                                        // Reduce before comment
];

export default { grammar, operators };
