// =============================================================================
// BUMPS Grammar (LL(1)-Optimized)
// =============================================================================
// Direct translation of ISO/IEC 11756:1999 MUMPS + modern extensions
//
// This is an LL(1)-friendly version with:
// - List patterns transformed to use *Tail helpers (29 rules fixed)
// - LevelLine factored to eliminate 52 common prefix conflicts
// - Expression operators kept as-is (precedence table handles them)
// - Generator-friendly structure with clear documentation
//
// Compile with: bun solar -o src/parser.js src/grammar-1.js
//
// Note: Some rules (OrExpr, AndExpr, etc.) intentionally keep left recursion.
// See comments for generator handling strategies.

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

  // FIXED: Removed left recursion - now uses LineListTail helper
  LineList: [
    ['Line LineListTail', '[1, ...2]'],
  ],

  // Tail helper for LineList
  LineListTail: [
    ['EOL Line LineListTail', '[2, ...3]'],
    ['EOL LineListTail', '[...2]'],
    ['', '[]'],
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
  //
  // FIXED: Major refactor - eliminated 52 common prefix conflicts
  // Original had 17 productions with massive ambiguity.
  // Now factored by first token, then by second token.

  LevelLine: [
    ['DotLevel DotLevelBody'],
    ['LABEL LabelBody'],
    ['LabelSpace IndentBody'],
  ],

  // After DotLevel token, what follows?
  DotLevelBody: [
    ['Spaces SpacesThenLineOrComment', '["do-line", null, 1, 3]'],
    ['LineBody', '["do-line", null, 1, 2]'],
    ['COMMENT', '["do-line", null, 1, ["comment", 2.value]]'],
    ['', '["do-line", null, 1, null]'],
  ],

  // After DotLevel Spaces, parse LineBody or COMMENT
  SpacesThenLineOrComment: [
    ['LineBody', '1'],
    ['COMMENT', '["comment", 1.value]'],
  ],

  // After LABEL token, what follows?
  LabelBody: [
    ['LabelSpace LabelSpaceBody', '["line", 1.value, ...2]'],
    ['COMMENT', '["line", 1.value, ["comment", 2.value]]'],
    ['', '["line", 1.value, null]'],
  ],

  // After LABEL LabelSpace, what follows?
  LabelSpaceBody: [
    ['DotLevel DotLevelWithLabel'],
    ['LineBody', '[2]'],
    ['COMMENT', '["comment", 3.value]'],
  ],

  // After LABEL LabelSpace DotLevel, what follows?
  DotLevelWithLabel: [
    ['Spaces LineBody', '[3, 5]'],
    ['LineBody', '[3, 4]'],
    ['Spaces COMMENT', '[3, ["comment", 5.value]]'],
    ['COMMENT', '[3, ["comment", 4.value]]'],
    ['', '[3, null]'],
  ],

  // After LabelSpace (indentation), what follows?
  IndentBody: [
    ['DotLevel IndentDotLevel', '["do-line", null, 2, ...3]'],
    ['LineBody', '["line", null, 2]'],
    ['COMMENT', '["line", null, ["comment", 2.value]]'],
  ],

  // After LabelSpace DotLevel (indented dots), what follows?
  IndentDotLevel: [
    ['Spaces LineBody', '[null, 4]'],
    ['', '[null, null]'],
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

  // FIXED: Removed left recursion
  ParamList: [
    ['IDENTIFIER ParamListTail', '[1.value, ...2]'],
  ],

  // Tail helper for ParamList
  ParamListTail: [
    ['COMMA IDENTIFIER ParamListTail', '[2.value, ...3]'],
    ['', '[]'],
  ],

  // ls = ( SPACE | SPACES | TAB )
  LabelSpace: [
    ['SPACE'],
    ['SPACES'],
    ['TAB'],
  ],

  // li = "." [ SPACE | SPACES ] ...
  // Note: Lexer emits DOT_LEVEL at line start, individual DOT tokens after labels
  // FIXED: Removed left recursion from sequence pattern
  DotLevel: [
    ['DOT_LEVEL', '1.value'],  // Multiple dots at line start (counted by lexer)
    ['DOT DotLevelTail', '[1, ...2]'],  // Single dot after label
  ],

  // Tail helper for DotLevel - accumulates DOT tokens
  DotLevelTail: [
    ['DOT DotLevelTail', '[$1 + 1, ...2]'],
    ['', '[]'],
  ],

  Spaces: [
    ['SPACE'],
    ['SPACES'],
  ],

  // linebody = ( commands [ cs [ comment ] ] | comment )
  // Expands to: commands | commands cs | commands cs comment | comment
  // FIXED: Simplified using OptTrailing helper
  LineBody: [
    ['Commands OptTrailing', '[1, ...2]'],
  ],

  // Helper for optional trailing spaces/comments
  OptTrailing: [
    ['Spaces OptComment', '[null, ...2]'],
    ['COMMENT', '[["comment", 1.value]]'],
    ['', '[]'],
  ],

  // Helper for optional comment after spaces
  OptComment: [
    ['COMMENT', '[["comment", 1.value]]'],
    ['', '[]'],
  ],

  // ===========================================================================
  // Commands
  // ===========================================================================

  // commands = command [ cs command ] ...
  // cs = ( SPACE | SPACES )
  // FIXED: Removed left recursion
  Commands: [
    ['Command CommandsTail', '[1, ...2]'],
  ],

  // Tail helper for Commands
  CommandsTail: [
    ['Spaces Command CommandsTail', '[2, ...3]'],
    ['', '[]'],
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

  // FIXED: Removed left recursion
  BreakArgList: [
    ['BreakArg BreakArgListTail', '[1, ...2]'],
  ],

  BreakArgListTail: [
    ['COMMA BreakArg BreakArgListTail', '[2, ...3]'],
    ['', '[]'],
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

  // FIXED: Removed left recursion
  CloseArgList: [
    ['Expression CloseArgListTail', '[1, ...2]'],
  ],

  CloseArgListTail: [
    ['COMMA Expression CloseArgListTail', '[2, ...3]'],
    ['', '[]'],
  ],

  // ===== DO =====
  // do = "D" [ "O" ] postcond [ SPACE | SPACES ] ( SPACE L(doargument) | SPACES )
  // doargument = ( entryref postcond | labelref actuallist postcond | "@" expratom V L(doargument) )

  DoArgs: [
    ['DoArgList'],
    ['Commands', '1'],  // Argumentless DO with inline commands: D  W "text"
    ['', 'null'],  // Argumentless DO (no inline)
  ],

  // FIXED: Removed left recursion
  DoArgList: [
    ['DoArg DoArgListTail', '[1, ...2]'],
  ],

  DoArgListTail: [
    ['COMMA DoArg DoArgListTail', '[2, ...3]'],
    ['', '[]'],
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
    ['Commands OptTrailing', '[1, ...2]'],
    ['', 'null'],
  ],

  // ===== FOR =====
  // for = "F" [ "OR" ] ( [ SPACE | SPACES ] | ( SPACE lvn "=" L(forparameter) ) )
  // forparameter = ( expr | numexpr ":" numexpr [ ":" numexpr ] )

  ForArgs: [
    ['LVN EQUALS ForParamList ForInline', '[1, 3, ...4]'],
    ['Commands OptTrailing', '[1, ...2]'],
    ['', 'null'],
  ],

  // Helper for optional inline commands after FOR parameters
  ForInline: [
    ['Spaces Commands OptTrailing', '[2, ...3]'],
    ['', '[]'],
  ],

  // FIXED: Removed left recursion
  ForParamList: [
    ['ForParam ForParamListTail', '[1, ...2]'],
  ],

  ForParamListTail: [
    ['COMMA ForParam ForParamListTail', '[2, ...3]'],
    ['', '[]'],
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

  // FIXED: Removed left recursion
  GotoArgList: [
    ['GotoArg GotoArgListTail', '[1, ...2]'],
  ],

  GotoArgListTail: [
    ['COMMA GotoArg GotoArgListTail', '[2, ...3]'],
    ['', '[]'],
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

  // FIXED: Removed left recursion
  HangArgList: [
    ['Expression HangArgListTail', '[1, ...2]'],
    ['INDIRECTION Expression', '["hang-indirect", 2]'],
  ],

  HangArgListTail: [
    ['COMMA Expression HangArgListTail', '[2, ...3]'],
    ['', '[]'],
  ],

  // ===== IF =====
  // if = "I" [ "F" ] ( [ SPACE | SPACES ] | ( SPACE L(ifargument) ) )
  // ifargument = ( tvexpr | "@" expratom V L(ifargument) )

  IfArgs: [
    ['IfArgList IfInline', '[1, ...2]'],
    ['', 'null'],  // Argumentless IF (tests $TEST)
  ],

  // Helper for optional inline commands/comments after IF conditions
  IfInline: [
    ['Spaces Commands OptTrailing', '["if-then", 3, ...4]'],
    ['Spaces OptComment', '[...2]'],
    ['COMMENT', '[["comment", 2.value]]'],
    ['', '[]'],
  ],

  // FIXED: Removed left recursion
  IfArgList: [
    ['Expression IfArgListTail', '[1, ...2]'],
    ['INDIRECTION Expression', '["if-indirect", 2]'],
  ],

  IfArgListTail: [
    ['COMMA Expression IfArgListTail', '[2, ...3]'],
    ['', '[]'],
  ],

  // ===== JOB =====
  // job = "J" [ "OB" ] postcond ( SPACE L(jobargument) | [ SPACE | SPACES ] )

  JobArgs: [
    ['JobArgList'],
    ['', 'null'],
  ],

  // FIXED: Factored with JobArgSuffix helper to reduce conflicts
  JobArgList: [
    ['EntryRef COLON ActualList JobArgSuffix', '[1, 3, ...4]'],
    ['Expression JobArgListTail', '[1, ...2]'],
  ],

  // Helper for optional suffix after EntryRef:ActualList
  JobArgSuffix: [
    ['COLON LPAREN DeviceParams RPAREN COLON Expression', '["job-full", 6, 9]'],
    ['COLON Expression COLON Expression', '["job-params-dev-timeout", 5, 7]'],
    ['COLON Expression', '["job-params-timeout", 5]'],
    ['', '["job-params"]'],
  ],

  JobArgListTail: [
    ['COMMA Expression JobArgListTail', '[2, ...3]'],
    ['', '[]'],
  ],

  // ===== KILL =====
  // kill = "K" [ "ILL" ] postcond killarglist
  // killarglist = ( [ SPACE | SPACES ] | ( SPACE L(killargument) ) )
  // killargument = ( glvn | "(" L(lname) ")" | "@" expratom V L(killargument) )

  KillArgs: [
    ['KillArgList'],
    ['', 'null'],
  ],

  // FIXED: Removed left recursion
  KillArgList: [
    ['KillArg KillArgListTail', '[1, ...2]'],
    ['LPAREN NameList RPAREN', '["kill-except", 2]'],  // Exclusive KILL
  ],

  KillArgListTail: [
    ['COMMA KillArg KillArgListTail', '[2, ...3]'],
    ['', '[]'],
  ],

  KillArg: [
    ['GLVN'],
    ['INDIRECTION Expression', '["kill-indirect", 2]'],
  ],

  // FIXED: Removed left recursion
  NameList: [
    ['IDENTIFIER NameListTail', '[1.value, ...2]'],
  ],

  NameListTail: [
    ['COMMA IDENTIFIER NameListTail', '[2.value, ...3]'],
    ['', '[]'],
  ],

  // ===== LOCK =====
  // lock = "L" [ "OCK" ] postcond ( [ SPACE | SPACES ] | ( SPACE L(lockargument) ) )
  // lockargument = ( ( [ "+" | "-" ] ( nref | "(" L(nref) ")" ) [ timeout ] ) | "@" expratom V L(lockargument) )

  LockArgs: [
    ['LockArgList'],
    ['', 'null'],  // L (release all)
  ],

  // FIXED: Removed left recursion
  LockArgList: [
    ['LockArg LockArgListTail', '[1, ...2]'],
    ['LPAREN LockMultiList RPAREN', '["lock-multi", 2]'],  // L (^A,^B,^C)
  ],

  LockArgListTail: [
    ['COMMA LockArg LockArgListTail', '[2, ...3]'],
    ['', '[]'],
  ],

  // FIXED: Removed left recursion
  LockMultiList: [
    ['NRef LockMultiListTail', '[1, ...2]'],
  ],

  LockMultiListTail: [
    ['COMMA NRef LockMultiListTail', '[2, ...3]'],
    ['', '[]'],
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

  // FIXED: Removed left recursion - special handling for first production
  MergeArgList: [
    ['GLVN EQUALS GLVN MergeArgListTail', '["=", 1, 3, ...4]'],
    ['INDIRECTION Expression', '["merge-indirect", 2]'],
  ],

  MergeArgListTail: [
    ['COMMA GLVN EQUALS GLVN MergeArgListTail', '[["=", 2, 4], ...5]'],
    ['', '[]'],
  ],

  // ===== NEW =====
  // new = "N" [ "EW" ] postcond ( [ SPACE | SPACES ] | ( SPACE L(newargument) ) )
  // newargument = ( lname | newsvn | "(" L(lname) ")" | "@" expratom V L(newargument) )

  NewArgs: [
    ['NewArgList'],
    ['', 'null'],  // Argumentless NEW (NEW all)
  ],

  // FIXED: Removed left recursion
  NewArgList: [
    ['NewArg NewArgListTail', '[1, ...2]'],
    ['LPAREN NameList RPAREN', '["new-except", 2]'],  // Exclusive NEW
  ],

  NewArgListTail: [
    ['COMMA NewArg NewArgListTail', '[2, ...3]'],
    ['', '[]'],
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

  // FIXED: Factored with OpenArgSuffix and OpenArgListTail
  OpenArgList: [
    ['Expression OpenArgSuffix', '[1, ...2]'],
  ],

  OpenArgSuffix: [
    ['COLON LPAREN DeviceParams RPAREN OpenTimeout', '["open-params", 4, ...6]'],
    ['COLON Expression OpenArgListTail', '["open-timeout", 2, ...3]'],
    ['OpenArgListTail', '1'],
  ],

  OpenTimeout: [
    ['COLON Expression', '[6]'],
    ['', '[]'],
  ],

  OpenArgListTail: [
    ['COMMA Expression OpenArgSuffix', '[2, ...3]'],
    ['', '[]'],
  ],

  // Device parameters are colon-separated expressions
  // FIXED: Removed left recursion
  DeviceParams: [
    ['Expression DeviceParamsTail', '[1, ...2]'],
  ],

  DeviceParamsTail: [
    ['COLON Expression DeviceParamsTail', '[2, ...3]'],
    ['', '[]'],
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

  // FIXED: Removed left recursion
  ReadArgList: [
    ['ReadArg ReadArgListTail', '[1, ...2]'],
  ],

  ReadArgListTail: [
    ['COMMA ReadArg ReadArgListTail', '[2, ...3]'],
    ['ReadArg ReadArgListTail', '[1, ...2]'],  // Format codes don't need comma
    ['', '[]'],
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

  // FIXED: Removed left recursion
  SetArgList: [
    ['SetArg SetArgListTail', '[1, ...2]'],
  ],

  SetArgListTail: [
    ['COMMA SetArg SetArgListTail', '[2, ...3]'],
    ['', '[]'],
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

  // FIXED: Removed left recursion
  SetLeftList: [
    ['SetLeft SetLeftListTail', '[1, ...2]'],
  ],

  SetLeftListTail: [
    ['COMMA SetLeft SetLeftListTail', '[2, ...3]'],
    ['', '[]'],
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

  // FIXED: Removed left recursion
  UseArgList: [
    ['Expression UseArgListTail', '[1, ...2]'],
  ],

  UseArgListTail: [
    ['COMMA Expression UseArgListTail', '[2, ...3]'],
    ['', '[]'],
  ],

  // ===== VIEW =====
  // view = "V" [ "IEW" ] postcond ( SPACE L(viewargument) | [ SPACE | SPACES ] )
  // viewargument = ( expr [ ":" expr ] ... | "@" expratom V L(viewargument) )

  ViewArgs: [
    ['ViewArgList'],
    ['', 'null'],
  ],

  // FIXED: Removed left recursion
  ViewArgList: [
    ['ViewArg ViewArgListTail', '[1, ...2]'],
  ],

  ViewArgListTail: [
    ['COMMA ViewArg ViewArgListTail', '[2, ...3]'],
    ['', '[]'],
  ],

  ViewArg: [
    ['Expression ColonExprList', '[1, ...2]'],
    ['Expression', '1'],
    ['INDIRECTION Expression', '["view-indirect", 2]'],
  ],

  // FIXED: Removed left recursion
  ColonExprList: [
    ['COLON Expression ColonExprListTail', '[2, ...3]'],
  ],

  ColonExprListTail: [
    ['COLON Expression ColonExprListTail', '[2, ...3]'],
    ['', '[]'],
  ],

  // ===== WRITE =====
  // write = "W" [ "RITE" ] postcond ( SPACE L(writeargument) | [ SPACE | SPACES ] )
  // writeargument = ( format | expr | "*" intexpr | "@" expratom V L(writeargument) )

  WriteArgs: [
    ['WriteArgList'],
    ['', 'null'],
  ],

  // FIXED: Removed left recursion
  WriteArgList: [
    ['WriteArg WriteArgListTail', '[1, ...2]'],
  ],

  WriteArgListTail: [
    ['COMMA WriteArg WriteArgListTail', '[2, ...3]'],
    ['WriteArg WriteArgListTail', '[1, ...2]'],  // Format codes don't need comma
    ['', '[]'],
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

  // FIXED: Removed left recursion
  XecuteArgList: [
    ['XecuteArg XecuteArgListTail', '[1, ...2]'],
  ],

  XecuteArgListTail: [
    ['COMMA XecuteArg XecuteArgListTail', '[2, ...3]'],
    ['', '[]'],
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
  //
  // NOTE: Expression operators kept left-recursive - precedence table handles!
  // Generator should recognize these patterns and produce iterative loops:
  //   let left = parseAndExpr()
  //   while (la.kind === 'OR') {
  //     match('OR')
  //     left = ["!", left, parseAndExpr()]
  //   }

  OrExpr: [
    ['AndExpr'],
    ['OrExpr OR AndExpr', '["!", 1, 3]'],  // ← LEFT-RECURSIVE (intentional)
  ],

  AndExpr: [
    ['CompareExpr'],
    ['AndExpr AND CompareExpr', '["&", 1, 3]'],  // ← LEFT-RECURSIVE (intentional)
  ],

  // relation = ( "=" | "==" | "<" | "<=" | ">" | ">=" | "[" | "]" | "]=" | "]]" | "]]=" )
  // truthop = ( relation | logicalop )

  CompareExpr: [
    ['ConcatExpr'],
    ['CompareExpr EQUALS ConcatExpr', '["=", 1, 3]'],  // ← LEFT-RECURSIVE (intentional)
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
    ['ConcatExpr CONCAT AddExpr', '["_", 1, 3]'],  // ← LEFT-RECURSIVE (intentional)
  ],

  // binaryop includes: "+" | "-"

  AddExpr: [
    ['MulExpr'],
    ['AddExpr PLUS MulExpr', '["+", 1, 3]'],  // ← LEFT-RECURSIVE (intentional)
    ['AddExpr MINUS MulExpr', '["-", 1, 3]'],
  ],

  // binaryop includes: "*" | "/" | "#" | "\\"

  MulExpr: [
    ['PowExpr'],
    ['MulExpr MULTIPLY PowExpr', '["*", 1, 3]'],  // ← LEFT-RECURSIVE (intentional)
    ['MulExpr DIVIDE PowExpr', '["/", 1, 3]'],
    ['MulExpr INT_DIVIDE PowExpr', '["\\\\", 1, 3]'],
    ['MulExpr MODULO PowExpr', '["#", 1, 3]'],
  ],

  // binaryop includes: "**" (right associative)

  PowExpr: [
    ['UnaryExpr'],
    ['UnaryExpr POWER PowExpr', '["**", 1, 3]'],  // Right-associative (correct as-is)
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

  // FIXED: Removed left recursion - ExprList now uses tail helpers
  // Complex due to $SELECT pairs (colon-separated) and optional args (empty commas)
  ExprList: [
    ['Expression ExprListTail', '[1, ...2]'],
  ],

  ExprListTail: [
    ['COLON Expression ExprListMore', '[["select-pair", $1, 2], ...3]'],  // $SELECT pair
    ['COMMA ExprListRest', '[...2]'],
    ['', '[]'],
  ],

  ExprListMore: [
    ['COMMA ExprListRest', '[...2]'],
    ['', '[]'],
  ],

  ExprListRest: [
    ['Expression ExprListTail', '[1, ...2]'],
    ['COMMA ExprListRest', '[null, ...2]'],  // Empty arg
    ['', '[]'],
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

  // FIXED: Removed left recursion - handles leading/trailing commas
  ActualArgList: [
    ['ActualOrEmpty ActualArgListTail', '[1, ...2]'],
    ['COMMA ActualRestList', '[null, ...2]'],  // Leading comma
  ],

  ActualOrEmpty: [
    ['Actual', '1'],
    ['', 'null'],
  ],

  ActualArgListTail: [
    ['COMMA ActualOrEmpty ActualArgListTail', '[2, ...3]'],
    ['', '[]'],
  ],

  ActualRestList: [
    ['Actual ActualArgListTail', '[1, ...2]'],
    ['COMMA ActualRestList', '[null, ...2]'],  // Multiple leading commas
    ['', '[]'],
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
  // FIXED: Removed left recursion from sequence pattern

  Pattern: [
    ['PatAtom PatternTail', '[1, ...2]'],
  ],

  PatternTail: [
    ['PatAtom PatternTail', '[1, ...2]'],
    ['', '[]'],
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

  // FIXED: Removed left recursion
  PatternAltList: [
    ['Pattern PatternAltListTail', '[1, ...2]'],
  ],

  PatternAltListTail: [
    ['COMMA Pattern PatternAltListTail', '[2, ...3]'],
    ['', '[]'],
  ],

};

// =============================================================================
// Operator Precedence (Low to High Binding)
// =============================================================================
// This table handles all ambiguity resolution for binary operators.
// Generator should use precedence-climbing or operator-precedence parsing.

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
