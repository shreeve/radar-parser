#!/usr/bin/env node

/**
 * Rip Test Runner - Using Production Rip to Compile Test Files
 *
 * This version uses the production Rip compiler to compile .rip test files,
 * then those tests exercise our RD parser!
 *
 * Workflow:
 * 1. Production Rip compiles test file → test JavaScript
 * 2. Execute test JS → calls test("name", "code", expected)
 * 3. test() uses OUR RD PARSER to compile "code"
 * 4. Compare results!
 *
 * Usage:
 *   node test/runner-rip.js test/rip/basic.rip
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { compile } from '../compiler-rd.js';

// Test helpers (same as runner.js)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

let totalTests = { pass: 0, fail: 0 };
let failures = [];

function normalizeCode(code) {
  return code
    .trim()
    .replace(/^\/\/.*\n/gm, '')
    .replace(/;\s*$/gm, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,=])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

async function test(name, code, expected) {
  try {
    const result = compile(code);
    const actual = eval(result.code);

    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      totalTests.pass++;
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
    } else {
      totalTests.fail++;
      console.log(`  ${colors.red}✗${colors.reset} ${name}`);
      failures.push({ test: name, expected, actual, code });
    }
  } catch (error) {
    totalTests.fail++;
    console.log(`  ${colors.red}✗${colors.reset} ${name} (${error.message})`);
    failures.push({ test: name, error: error.message, code });
  }
}

function code(name, sourceCode, expectedCode) {
  try {
    const result = compile(sourceCode);
    const actualNorm = normalizeCode(result.code);
    const expectedNorm = normalizeCode(expectedCode);

    if (actualNorm === expectedNorm) {
      totalTests.pass++;
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
    } else {
      totalTests.fail++;
      console.log(`  ${colors.red}✗${colors.reset} ${name}`);
      failures.push({ test: name, expected: expectedCode, actual: result.code });
    }
  } catch (error) {
    totalTests.fail++;
    console.log(`  ${colors.red}✗${colors.reset} ${name} (${error.message})`);
    failures.push({ test: name, error: error.message });
  }
}

function fail(name, sourceCode) {
  try {
    const result = compile(sourceCode);
    try {
      eval(result.code);
      totalTests.fail++;
      console.log(`  ${colors.red}✗${colors.reset} ${name} (should have failed)`);
    } catch (execError) {
      totalTests.pass++;
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
    }
  } catch (compileError) {
    totalTests.pass++;
    console.log(`  ${colors.green}✓${colors.reset} ${name}`);
  }
}

// Main
const testFile = process.argv[2] || 'test/rip/basic.rip';
console.log(`${colors.cyan}Testing: ${testFile}${colors.reset}\n`);

try {
  // Use production Rip to compile the test file
  console.log('📦 Compiling test file with production Rip...');
  const jsCode = execSync(`rip -c ${testFile}`, { encoding: 'utf-8' });
  
  console.log('✅ Test file compiled!\n');
  
  // Execute the compiled test file with our test helpers
  const testFn = new Function('test', 'code', 'fail', 'console', jsCode);
  await testFn(test, code, fail, console);
  
  // Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${colors.green}✓ ${totalTests.pass} passing${colors.reset}`);
  if (totalTests.fail > 0) {
    console.log(`${colors.red}✗ ${totalTests.fail} failing${colors.reset}`);
  }
  
} catch (error) {
  console.error(`${colors.red}Failed to run tests:${colors.reset}`, error.message);
  process.exit(1);
}
