# Test Failure Analysis - Remaining Work to 100%

## 📊 Current Status: 823/938 passing (87.7%)

**Remaining:** 115 failures (12.3%)

**Last Updated:** November 8, 2025

---

## Failure Categories by Error Type

### 1. OUTDENT Issues (28 failures - 24.3%)

**Problem:** Parser expects OUTDENT but gets more code

**Affected patterns:**
- Break/continue statements in loops (11 failures)
- Switch statement blocks (15 failures)
- Super calls in classes (2 failures)

**Examples:**
```coffeescript
# Break/continue with postfix conditionals
for x in arr
  break if x > 5        # ← Expected OUTDENT at "if"

# Switch with inline when
switch value
  when 1 then 'one'     # ← Expected OUTDENT at "then"

# Classes with super
class Child extends Parent
  method: ->
    super.method()      # ← Expected OUTDENT issues
```

**Fix difficulty:** 🟡 Medium - Need better OUTDENT handling in loop bodies and switch cases

**Files affected:**
- async.rip (2 tests)
- classes.rip (4 tests)
- comprehensions.rip (2 tests)
- control.rip (1 test)
- loops.rip (3 tests)
- stabilization.rip (16 tests)

---

### 2. INDENT Issues (22 failures - 19.1%)

**Problem:** Parser expects INDENT (block start) but gets inline syntax

**Affected patterns:**
- Try/catch with `catch` keyword (9 failures)
- Inline `else if` chains (7 failures)
- Inline arrow functions (2 failures)
- `if exists?` existence checks (2 failures)
- Throw in ternary (2 failures)

**Examples:**
```coffeescript
# Try/catch needs lexer rewriter for inline syntax
try
  risky()
catch err              # ← Expected INDENT (needs "then" or lexer fix)
  handle(err)

# Else if inline
if x then 1 else if y then 2  # ← Expected INDENT at second "if"

# Inline arrow in array
[(x) -> x + 1]         # ← Expected INDENT (needs inline Code support)

# Existence checks
if x? then 'yes'       # ← Expected INDENT at "then"
```

**Fix difficulty:** 🔴 Hard - Requires lexer rewriter enhancements for inline syntax

**Files affected:**
- async.rip (2 tests)
- control.rip (1 test)
- errors.rip (7 tests)
- functions.rip (1 test)
- optional.rip (2 tests)
- semicolons.rip (1 test)
- stabilization.rip (8 tests)

---

### 3. Codegen Failures (16 failures - 13.9%)

**Problem:** Parse succeeds but JavaScript execution fails

**Affected patterns:**
- Nested ternary edge cases (3 failures)
- Unless/unless-else constructs (5 failures)
- Nested for-in loops (1 failure)
- Regex operations (7 failures - runtime behavior)

**Examples:**
```coffeescript
# Unless-else generates incorrect JS
unless x
  1
else
  2

# Nested ternary precedence
a ? b : c ? d : e

# Regex runtime behavior
/(\w+)/.exec(str)[1]  # Works but may have edge cases
```

**Fix difficulty:** 🟢 Easy - Issues in action rules or codegen patterns (note: codegen.js is marked UNMODIFIED)

**Files affected:**
- control.rip (3 tests)
- loops.rip (1 test)
- regex.rip (7 tests)
- stabilization.rip (5 tests)

**Note:** Per AGENT.md, codegen.js should remain untouched. These may need grammar action fixes instead.

---

### 4. Expected End of Input (12 failures - 10.4%)

**Problem:** Leftover tokens after parsing (incomplete parse)

**Affected patterns:**
- Existence operator `x?` standalone (7 failures)
- Postfix while/until `x++ while condition` (2 failures)
- Super standalone calls (2 failures)
- Dynamic postfix patterns (1 failure)

**Examples:**
```coffeescript
# Existence check operator
x?                     # ← Expected end of input (? not consumed)

# Postfix loops
i++ while i < 10       # ← Expected end of input

# Bare super
super                  # ← Expected end of input
```

**Fix difficulty:** 🟡 Medium - Need to add token support in grammar/special handlers

**Files affected:**
- classes.rip (2 tests)
- loops.rip (2 tests)
- optional.rip (7 tests)
- stabilization.rip (1 test)

---

### 5. Regex Index Issues (9 failures - 7.8%)

**Problem:** `Expected INDEX_END` in regex capture access

**Affected pattern:**
- Array indexing after regex operations

**Example:**
```coffeescript
match = /(\w+)@(\w+)/.exec(email)
domain = match[1]      # ← Expected INDEX_END

result = /test/.exec(str)[0]  # ← Expected INDEX_END
```

**Fix difficulty:** 🟢 Easy - Likely array indexing after method calls not handled properly

**Files affected:**
- regex.rip (9 tests)

**Root cause:** Probably an issue with accessor chaining after method calls (exec() returns array)

---

### 6. Export Statement Issues (9 failures - 7.8%)

**Problem:** `Expected CLASS` after EXPORT keyword

**Affected patterns:**
- All export variants except `export default class`

**Examples:**
```coffeescript
export x = 5           # ← Expected CLASS
export def foo()       # ← Expected CLASS
export { a, b }        # ← Expected CLASS
export default x       # ← Expected CLASS
export * from './mod'  # ← Expected CLASS
```

**Fix difficulty:** 🟡 Medium - Export handler too restrictive, needs expansion

**Files affected:**
- modules.rip (9 tests)

**Current behavior:** Export only handles `export default class`, needs all 9 export forms

---

### 7. Invalid Value (5 failures - 4.3%)

**Problem:** Token not recognized as valid in parseValue

**Affected patterns:**
- Throw in expressions (3 failures)
- Async in class methods (1 failure)
- Complex guards (1 failure)

**Examples:**
```coffeescript
# Throw as expression
x || throw new Error() # ← Invalid Value (throw not in parseValue)

# Async method
class X
  method: async ->     # ← Invalid Value (async not recognized)
```

**Fix difficulty:** 🟡 Medium - Need expression-level throw/async support

**Files affected:**
- classes.rip (1 test)
- errors.rip (3 tests)
- guards.rip (1 test)

---

### 8. Minor Edge Cases (14 failures - 12.2%)

**Problem:** Various specific edge cases needing targeted fixes

**Breakdown:**
- **Invalid RangeDots (2)** - `for {x=1} from` destructuring with defaults
- **Invalid Operation (2)** - `return if` postfix conditionals on statements
- **Invalid Assignable (2)** - `import()` dynamic imports
- **Expected } (2)** - Import aliases `import {x as y}`
- **Expected ) (2)** - Complex comprehension guards with multiple conditions
- **Expected : (1)** - Ternary with operations `x + 1 ? y : z`
- **Expected for loop type (1)** - Postfix range syntax
- **Invalid String (1)** - Heregex with interpolation

**Examples:**
```coffeescript
# Invalid RangeDots
for {x = 1} from arr   # ← Invalid RangeDots

# Invalid Operation
return if x < 0        # ← Invalid Operation (postfix on statement)

# Invalid Assignable
result = import('./mod')  # ← Invalid Assignable

# Expected }
import {x as y} from 'mod'  # ← Expected }

# Complex guards
(x for x in arr when x > 0 and x < 10)  # ← Expected )

# Ternary with operations
x + 1 ? y : z          # ← Expected :

# Postfix range
(i for i in [1..10])   # ← Expected for loop type
```

**Fix difficulty:** 🟡 Mixed - Each needs targeted fix

**Files affected:**
- async.rip (1 test)
- comprehensions.rip (2 tests)
- control.rip (1 test)
- functions.rip (2 tests)
- guards.rip (1 test)
- loops.rip (1 test)
- modules.rip (2 tests)
- regex.rip (1 test)
- stabilization.rip (3 tests)

---

## 🎯 Recommended Attack Strategy

### Option A: Quick Wins to 90% (+25 tests) ⭐ RECOMMENDED

Focus on easier, high-impact fixes that only require solar.rip changes:

**1. Regex indexing (9 tests)** 🟢 Easy
- Add proper array indexing after method calls (`.exec()[0]`)
- Fix accessor chaining to handle call results
- Estimated time: 1-2 hours

**2. Export statements (9 tests)** 🟡 Medium
- Expand Export handler to handle all 9 variants
- Add proper lookahead for different export types
- Reference: Import handler already does similar logic
- Estimated time: 2-3 hours

**3. Existence operator (7 tests)** 🟡 Medium
- Add `?` unary operator support for existence checks
- Handle in parseOperation or as postfix operator
- Estimated time: 2-3 hours

**Total: 25 tests → 848/938 (90.4% passing!)** ✨

**Why this is best:**
- ✅ All fixes in solar.rip (no lexer/codegen changes)
- ✅ Clear, well-defined patterns
- ✅ High success probability
- ✅ 90% is a psychological milestone
- ✅ Validates the methodology

---

### Option B: Structural Improvements to 92-93% (+40-50 tests)

Tackle architectural issues after completing Option A:

**4. OUTDENT handling (28 tests)** 🟡 Medium
- Fix break/continue with postfix conditionals
- Improve switch statement block detection
- Better indentation tracking in nested structures
- Estimated time: 4-6 hours

**Plus Option A (25 tests)**

**Total: 53 tests → 876/938 (93.4% passing!)**

**Challenge:**
- More complex control flow issues
- Requires deep understanding of INDENT/OUTDENT tracking
- May uncover edge cases

---

### Option C: Push Towards 95%+ (+60+ tests)

Requires lexer modifications (may violate "lexer.js UNMODIFIED" principle):

**5. INDENT issues (22 tests)** 🔴 Hard
- Lexer rewriter for inline `catch`/`else if`/`then` keyword
- Inline arrow functions need Expression-level Code
- **Problem:** Requires lexer.js changes (currently untouched per AGENT.md)
- Estimated time: 8-12 hours

**Plus Options A & B (53 tests)**

**Total: 75+ tests → 898/938 (95.7% passing!)**

**Warning:**
- ⚠️ Violates "UNMODIFIED lexer.js" principle from AGENT.md
- ⚠️ Complex rewriter logic
- ⚠️ May introduce regressions

---

### Option D: The Perfection Path to 100% (+115 tests)

**All of the above, plus:**

**6. Codegen fixes (16 tests)**
- Fix unless/unless-else generation
- Fix nested ternary precedence
- Fix nested loop patterns
- **Problem:** Requires codegen.js changes (marked UNMODIFIED)

**7. Edge case cleanup (14 tests)**
- Individual fixes for each unique pattern
- Dynamic import support
- Complex comprehension guards
- Postfix statement conditionals

**Total: 115 tests → 938/938 (100% passing!)** 🏆

**Reality check:**
- Some tests may be hitting legitimate LL(1) limitations
- Codegen fixes violate the architecture principle
- May require weeks of work
- Diminishing returns (87.7% → 100% for 12.3% of tests)

---

## 📋 File-by-File Breakdown

### High-Impact Files (20+ tests remaining)

**stabilization.rip: 22 failures**
- Switch statements (9)
- If-else-if chains (6)
- Break/continue with conditions (3)
- Unless constructs (2)
- Dynamic imports (2)

**Note:** This is the "stability/edge cases" file, naturally has the hardest tests

---

### Medium-Impact Files (5-15 tests remaining)

**regex.rip: 18 failures**
- Regex capture indexing (9)
- Regex runtime behavior (7)
- Heregex interpolation (1)
- Codegen edge cases (1)

**modules.rip: 11 failures**
- Export variants (9)
- Import aliases (2)

**optional.rip: 10 failures**
- Existence operator `?` (7)
- Existence in conditionals (2)
- Codegen (1)

**errors.rip: 10 failures**
- Try/catch inline syntax (7)
- Throw in expressions (3)

**control.rip: 12 failures**
- Switch statements (6)
- Unless constructs (3)
- Ternary edge cases (2)
- Else-if inline (1)

**classes.rip: 8 failures**
- Super calls (5)
- Async methods (1)
- new.target (1)
- Standalone super (1)

**loops.rip: 9 failures**
- Break/continue (4)
- Postfix loops (2)
- Destructuring (1)
- Nested loops (1)
- Postfix range (1)

---

### Low-Impact Files (1-5 tests remaining)

**async.rip: 5 failures**
- Try/catch (2)
- Break/continue (2)
- Destructuring (1)

**functions.rip: 3 failures**
- Inline arrow (1)
- Return postfix (2)

**comprehensions.rip: 3 failures**
- Multiple guards (1)
- Break/continue (2)

**guards.rip: 2 failures**
- Complex guards (1)
- Guard with not (1)

**semicolons.rip: 1 failure**
- Try/catch (1)

---

## 🎓 Key Insights

### What's Working Well (87.7%)

The parser handles these patterns PERFECTLY:
- ✅ All operators (100%)
- ✅ All literals (100%)
- ✅ All properties (100%)
- ✅ All strings (100%)
- ✅ All arrows (100%)
- ✅ All data structures (100%)
- ✅ All assignments (100%)
- ✅ All parens/precedence (100%)
- ✅ All basic syntax (100%)
- ✅ All compatibility patterns (100%)
- ✅ Most functions (96.3%)
- ✅ Most semicolons (92.3%)
- ✅ Most async (86.1%)

### What Needs Work (12.3%)

The remaining failures cluster in these areas:

1. **Inline syntax** (22 tests) - Lexer rewriter territory
2. **Indentation edge cases** (28 tests) - Complex control flow
3. **Missing operators** (16 tests) - Existence `?`, postfix loops
4. **Incomplete handlers** (18 tests) - Export, regex indexing
5. **Codegen quirks** (16 tests) - Unless, nested ternary
6. **Edge cases** (15 tests) - One-off patterns

### Architecture Validation

**The clean architecture works!**
- 87.7% achieved with ZERO lexer changes
- 87.7% achieved with ZERO codegen changes
- All improvements via solar.rip only
- S-expressions provide perfect interface

**Path to 90%+ stays clean:**
- Regex indexing: solar.rip only
- Export statements: solar.rip only
- Existence operator: solar.rip only
- OUTDENT fixes: solar.rip only

**Path to 95%+ gets messy:**
- Inline syntax: needs lexer.js changes
- Codegen issues: needs codegen.js changes
- May violate the architecture principle

---

## 💡 Final Recommendation

**Go for Option A: Quick wins to 90%!**

**Why:**
1. **Clean architecture maintained** - No lexer/codegen changes
2. **High probability of success** - Well-defined patterns
3. **Psychological milestone** - 90% sounds amazing
4. **Validates approach** - Proves the methodology works
5. **Natural stopping point** - Can declare victory or continue

**After 90%, reassess:**
- Option B (93%) if momentum is good
- Declare victory at 90% if satisfied
- Document remaining 10% as known limitations

**Order of attack:**
1. Start with regex indexing (9 tests, easiest)
2. Then existence operator (7 tests, medium)
3. Finish with exports (9 tests, medium)
4. Celebrate 90%! 🎉

---

## 📊 Expected Timeline

**Option A (to 90%):**
- Regex: 1-2 hours
- Existence: 2-3 hours
- Exports: 2-3 hours
- Testing/polish: 1-2 hours
- **Total: 6-10 hours** ⏱️

**Option B (to 93%):**
- Option A: 6-10 hours
- OUTDENT: 4-6 hours
- Testing/polish: 2-3 hours
- **Total: 12-19 hours** ⏱️

**Option C (to 95%):**
- Options A+B: 12-19 hours
- INDENT/lexer: 8-12 hours
- Testing/polish: 3-4 hours
- **Total: 23-35 hours** ⏱️

**Option D (to 100%):**
- Options A+B+C: 23-35 hours
- Codegen: 6-8 hours
- Edge cases: 8-12 hours
- Testing/polish: 4-6 hours
- **Total: 41-61 hours** ⏱️

---

**Let's start with Option A and get to that beautiful 90%!** 🚀
