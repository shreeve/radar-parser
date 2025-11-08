// RD Compiler - Uses Recursive Descent Parser for blazing-fast parsing!
// Same flow as compiler.js but with RD parser instead of table-driven

import { Lexer } from './lexer.js';
import { parser } from './parser.js';
import { CodeGenerator } from './codegen.js';

// ==============================================================================
// S-Expression Pretty Printer (copied from compiler.js)
// ==============================================================================

const INLINE_FORMS = new Set([
  '+', '-', '*', '/', '\\', '#', '**', '_',       // Binary operators
  '=', '<', '>', '[', ']', ']]', '!', '&', '?',   // Comparison & logical
  '\'', 'not',                                    // Unary NOT, negated compare
  'var', 'num', 'str', 'global', 'naked-global',  // Atoms and variables
  'tag', 'entryref', 'assign', 'pass-by-ref',     // References and assignment
  'newline', 'formfeed', 'tab', 'ascii',          // WRITE format codes
  'value', 'read-var', 'read-newline',            // Simple command args
  'lock-var', 'lock-incr', 'lock-decr',           // LOCK operations
  '.', '?.', '::', '?::', '[]', '?[]',            // Property access (Rip)
  'optindex', 'optcall',                          // Optional access (Rip)
  '%', '//', '%%',                                // More arithmetic (Rip)
  '==', '!=', '<=', '>=', '===', '!==',          // More comparison (Rip)
  '&&', '||', '??', '&', '|', '^',               // Logical/bitwise (Rip)
  '<<', '>>', '>>>',                              // Bitwise shifts (Rip)
  'rest', 'default', '...', 'expansion'           // Params (Rip)
]);

function isInline(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const head = arr[0]?.valueOf?.() ?? arr[0];
  if (INLINE_FORMS.has(head)) return true;
  return arr.length <= 4 && !arr.some(Array.isArray);
}

function formatAtom(elem) {
  if (Array.isArray(elem)) return '(???)';
  if (typeof elem === 'number') return String(elem);
  if (elem === null) return 'null';
  if (elem === '') return '""';

  const str = String(elem);

  // Handle multi-line regexes (heregex) - collapse to single line
  if (str[0] === '/' && str.indexOf('\n') >= 0) {
    const match = str.match(/\/([gimsuvy]*)$/);
    const flags = match ? match[1] : '';
    let content = str.slice(1);
    if (flags) content = content.slice(0, -flags.length - 1);
    else content = content.slice(0, -1);
    const lines = content.split('\n');
    const cleaned = lines.map(line => line.replace(/#.*$/, '').trim());
    const processed = cleaned.join('');
    return `"/${processed}/${flags}"`;
  }

  return str;
}

function formatSExpr(arr, indent = 0, isTopLevel = false) {
  if (!Array.isArray(arr)) return formatAtom(arr);

  if (isInline(arr)) {
    const parts = arr.map(elem => Array.isArray(elem) ? formatSExpr(elem, 0, false) : formatAtom(elem));
    return `(${parts.join(' ')})`;
  }

  if (isTopLevel && arr[0] === 'program') {
    const secondElem = arr[1];
    const header = Array.isArray(secondElem)
      ? '(program'
      : '(program ' + formatAtom(secondElem);
    const lines = [header];
    const startIndex = Array.isArray(secondElem) ? 1 : 2;

    for (let i = startIndex; i < arr.length; i++) {
      let childFormatted = formatSExpr(arr[i], 2, false);
      if (childFormatted[0] === '(') {
        childFormatted = '  ' + childFormatted;
      }
      lines.push(childFormatted);
    }
    lines.push(')');
    return lines.join('\n');
  }

  const spaces = ' '.repeat(indent);
  const lines = [];
  const head = Array.isArray(arr[0]) ? formatSExpr(arr[0], 0, false) : formatAtom(arr[0]);
  lines.push(`${spaces}(${head}`);

  for (let i = 1; i < arr.length; i++) {
    const elem = arr[i];
    if (Array.isArray(elem)) {
      const formatted = formatSExpr(elem, indent + 2, false);
      if (isInline(elem)) {
        lines[lines.length - 1] += ` ${formatted}`;
      } else {
        lines.push(formatted);
      }
    } else {
      lines[lines.length - 1] += ` ${formatAtom(elem)}`;
    }
  }

  lines[lines.length - 1] += ')';
  return lines.join('\n');
}

// ==============================================================================
// RD Compiler
// ==============================================================================

export class CompilerRD {
  constructor(options = {}) {
    this.options = {
      showTokens: false,
      showSExpr: false,
      showParseCalls: false,  // NEW! Show parse function calls
      ...options
    };
  }

  compile(source) {
    console.log('🚀 RD Compiler Starting...\n');

    // Step 0: Handle __DATA__ marker
    let dataSection = null;
    const lines = source.split('\n');
    const dataLineIndex = lines.findIndex(line => line === '__DATA__');

    if (dataLineIndex !== -1) {
      const dataLines = lines.slice(dataLineIndex + 1);
      dataSection = dataLines.length > 0 ? dataLines.join('\n') + '\n' : '';
      source = lines.slice(0, dataLineIndex).join('\n');
    }

    // Step 1: Tokenize with Rip lexer
    console.log('📊 Step 1: Lexing...');
    const lexer = new Lexer();
    const tokens = lexer.tokenize(source);
    console.log(`   ✅ ${tokens.length} tokens produced\n`);

    if (this.options.showTokens) {
      console.log('📋 TOKENS:');
      tokens.forEach((t, i) => {
        const val = String(t[1]).replace(/\n/g, '\\n').substring(0, 30);
        console.log(`   ${String(i+1).padStart(3)}. ${t[0].padEnd(20)} "${val}"`);
      });
      console.log();
    }

    // Step 2: Setup RD parser with lexer
    console.log('🎯 Step 2: Parsing (Recursive Descent)...');

    let parseCalls = 0;
    if (this.options.showParseCalls) {
      // Wrap parse functions to show calls
      const originalParse = parser.parseRoot.bind(parser);
      parser.parseRoot = function(...args) {
        console.log(`   → parseRoot()`);
        return originalParse.apply(this, args);
      };
    }

    parser.lexer = {
      tokens: tokens,
      pos: 0,

      setInput(input, yy) {
        // Already tokenized, nothing to do
        this.yy = yy || {};
      },

      lex() {
        if (this.pos >= this.tokens.length) return null; // EOF
        const token = this.tokens[this.pos++];

        // CRITICAL: Preserve String objects with metadata!
        // token[1] might be a String object with .quote, .heregex, .await, etc.
        this.yytext = token[1];
        this.yylineno = token[2]?.first_line || 0;
        this.yylloc = token[2] || {};

        // Return token tag (type)
        return token[0];
      }
    };

    let sexpr;
    try {
      sexpr = parser.parse(source);
      console.log(`   ✅ Parsing successful!\n`);
    } catch (parseError) {
      console.log(`   ❌ Parse error: ${parseError.message}\n`);

      // Check for common unsupported patterns
      if (/\?\s*\([^)]*\?[^)]*:[^)]*\)\s*:/.test(source) ||
          /\?\s+\w+\s+\?\s+/.test(source)) {
        throw new Error('Nested ternary operators are not supported. Use if/else statements instead:\n' +
                       '  Instead of: x ? (y ? a : b) : c\n' +
                       '  Use: if x then (if y then a else b) else c');
      }
      throw parseError;
    }

    if (this.options.showSExpr) {
      console.log('🌳 S-EXPRESSION AST:');
      console.log(formatSExpr(sexpr, 0, true));
      console.log();
    }

    // Step 3: Generate JavaScript code
    console.log('⚙️  Step 3: Generating JavaScript...');
    const generator = new CodeGenerator({ dataSection });
    let code = generator.compile(sexpr);
    console.log(`   ✅ Code generation complete!\n`);

    return {
      tokens,
      sexpr,
      code,
      data: dataSection
    };
  }

  compileToJS(source) {
    return this.compile(source).code;
  }

  compileToSExpr(source) {
    return this.compile(source).sexpr;
  }
}

// Convenience functions
export function compile(source, options = {}) {
  const compiler = new CompilerRD(options);
  return compiler.compile(source);
}

export function compileToJS(source, options = {}) {
  const compiler = new CompilerRD(options);
  return compiler.compileToJS(source);
}

export { formatSExpr };
