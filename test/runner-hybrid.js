#!/usr/bin/env node

/**
 * Hybrid Test Runner for RD Parser
 *
 * Uses production Rip to compile test files, then those tests exercise our RD parser!
 *
 * Workflow:
 * 1. Test file.rip → Production Rip → test JavaScript
 * 2. Execute test JS → calls test("name", "code", expected)
 * 3. test() uses OUR RD COMPILER to compile "code"
 * 4. Compare results!
 *
 * Usage:
 *   node test/runner-hybrid.js test/rip/basic.rip
 *   node test/runner-hybrid.js test/rip
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, extname, relative, basename } from 'path';
import { compile } from '../rip/compiler.js';
import { tmpdir } from 'os';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test tracking
let currentFile = '';
let fileTests = { pass: 0, fail: 0 };
let totalTests = { pass: 0, fail: 0 };
let failures = [];

// Normalize code for comparison
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

// Test helper: Execute code and compare result
async function test(name, code, expected) {
  try {
    const result = compile(code);
    const actual = await eval(result.code);

    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      fileTests.pass++;
      totalTests.pass++;
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
    } else {
      fileTests.fail++;
      totalTests.fail++;
      console.log(`  ${colors.red}✗${colors.reset} ${name}`);
      failures.push({
        file: currentFile,
        test: name,
        type: 'test',
        expected: JSON.stringify(expected),
        actual: JSON.stringify(actual),
        code
      });
    }
  } catch (error) {
    fileTests.fail++;
    totalTests.fail++;
    console.log(`  ${colors.red}✗${colors.reset} ${name} - ${error.message.split('\n')[0]}`);
    failures.push({
      file: currentFile,
      test: name,
      type: 'test',
      error: error.message,
      code
    });
  }
}

// Test helper: Compile and compare generated code
function code(name, sourceCode, expectedCode) {
  try {
    const result = compile(sourceCode);
    const actualNorm = normalizeCode(result.code);
    const expectedNorm = normalizeCode(expectedCode);

    if (actualNorm === expectedNorm) {
      fileTests.pass++;
      totalTests.pass++;
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
    } else {
      fileTests.fail++;
      totalTests.fail++;
      console.log(`  ${colors.red}✗${colors.reset} ${name}`);
      failures.push({
        file: currentFile,
        test: name,
        type: 'code',
        expected: expectedCode,
        actual: result.code
      });
    }
  } catch (error) {
    fileTests.fail++;
    totalTests.fail++;
    console.log(`  ${colors.red}✗${colors.reset} ${name} - ${error.message.split('\n')[0]}`);
    failures.push({
      file: currentFile,
      test: name,
      type: 'code',
      error: error.message,
      sourceCode
    });
  }
}

// Test helper: Expect failure
function fail(name, sourceCode) {
  try {
    const result = compile(sourceCode);
    try {
      eval(result.code);
      fileTests.fail++;
      totalTests.fail++;
      console.log(`  ${colors.red}✗${colors.reset} ${name} (should have failed)`);
    } catch (execError) {
      fileTests.pass++;
      totalTests.pass++;
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
    }
  } catch (compileError) {
    fileTests.pass++;
    totalTests.pass++;
    console.log(`  ${colors.green}✓${colors.reset} ${name}`);
  }
}

// Run a single test file
async function runTestFile(filePath) {
  currentFile = relative(process.cwd(), filePath);
  fileTests = { pass: 0, fail: 0 };

  console.log(`\n${colors.cyan}${currentFile}${colors.reset}`);

  try {
    // Use production Rip to compile the test file
    const jsCode = execSync(`rip -c ${filePath}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });

    // Execute the compiled test file with our test helpers
    const testFn = new (async function(){}).constructor('test', 'code', 'fail', 'console', jsCode);
    await testFn(test, code, fail, console);

  } catch (error) {
    console.log(`  ${colors.red}✗ File failed to compile/execute${colors.reset}`);
    console.log(`    ${error.message}`);
    fileTests.fail++;
    totalTests.fail++;
  }

  return fileTests;
}

// Recursively find all test files
function findTestFiles(path) {
  try {
    const stats = statSync(path);

    if (stats.isFile()) {
      return ['.rip'].includes(extname(path)) ? [path] : [];
    }

    if (stats.isDirectory()) {
      if (path.includes('/fixtures')) return [];
      const entries = readdirSync(path).sort();
      return entries.flatMap(entry => findTestFiles(join(path, entry)));
    }
  } catch (error) {
    console.error(`${colors.red}Error reading path: ${path}${colors.reset}`);
  }

  return [];
}

// Print failure summary
function printFailures() {
  if (failures.length === 0) return;

  console.log(`\n${colors.bright}${colors.red}Failure Details:${colors.reset}\n`);

  failures.slice(0, 20).forEach((failure, index) => {
    console.log(`${colors.bright}${index + 1}. ${failure.file} - ${failure.test}${colors.reset}`);
    if (failure.error) {
      console.log(`   Error: ${failure.error.split('\n')[0]}`);
    }
    if (failure.type === 'test') {
      console.log(`   Expected: ${failure.expected}`);
      console.log(`   Actual:   ${failure.actual}`);
    }
    console.log('');
  });

  if (failures.length > 20) {
    console.log(`   ... and ${failures.length - 20} more failures\n`);
  }
}

// Main
async function main(args) {
  if (args.length === 0) {
    args = ['test/rip'];
    console.log(`${colors.cyan}Running default: test/rip${colors.reset}\n`);
  }

  const testFiles = args.flatMap(arg => findTestFiles(arg));

  if (testFiles.length === 0) {
    console.log(`${colors.yellow}No test files found${colors.reset}`);
    process.exit(0);
  }

  console.log(`${colors.bright}🧪 Hybrid Test Runner${colors.reset}`);
  console.log(`${colors.bright}Production Rip compiles test files → Our RD Parser runs tests${colors.reset}`);
  console.log(`${colors.bright}Running ${testFiles.length} test file(s)...${colors.reset}`);

  for (const file of testFiles) {
    await runTestFile(file);
  }

  // Summary
  console.log(`\n${colors.bright}${'─'.repeat(60)}${colors.reset}`);

  if (totalTests.fail > 0) {
    console.log(`${colors.red}${colors.bright}Test failures detected${colors.reset}`);
    printFailures();
  } else {
    console.log(`${colors.green}${colors.bright}🎉 ALL TESTS PASSED!${colors.reset}`);
  }

  console.log(`${colors.green}✓ ${totalTests.pass} passing${colors.reset}`);
  if (totalTests.fail > 0) {
    console.log(`${colors.red}✗ ${totalTests.fail} failing${colors.reset}`);
  }

  // Calculate and display percentage
  const total = totalTests.pass + totalTests.fail;
  if (total > 0) {
    const percentage = ((totalTests.pass / total) * 100).toFixed(1);
    console.log(`${colors.bright}• ${percentage}% passing${colors.reset}`);
  }

  process.exit(totalTests.fail > 0 ? 1 : 0);
}

// Run
await main(process.argv.slice(2));
