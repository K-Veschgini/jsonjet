# Scan Operator Examples

This directory contains JavaScript implementations of the examples from the [Microsoft ADX scan operator documentation](https://learn.microsoft.com/en-us/kusto/query/scan-operator?view=microsoft-fabric).

## Examples Overview

### JavaScript API Examples (Original)
- `cumulative-example.js` - Direct ScanOperator API usage for cumulative sum
- `session-tracking-example.js` - Direct ScanOperator API for session tracking

### Query Language Examples (New)
- `cumulative-query-example.js` - Same logic using Kusto-like query syntax
- `session-tracking-query-example.js` - Session tracking using query language
- `basic-sequence-query-example.js` - Start/stop sequence detection
- `error-pattern-query-example.js` - Error counting and pattern detection
- `user-activity-query-example.js` - Complex user session tracking with timeout

## Detailed Example Descriptions

### Cumulative Sum Examples
**Purpose**: Demonstrates accumulating values across stream events
- **JavaScript API**: `cumulative-example.js`
- **Query Language**: `cumulative-query-example.js`
- **Features**: State initialization, cumulative calculation, emit on each match
- **Query**: `data | scan (step cumSum: true => cumSum.total = iff(cumSum.total, cumSum.total + x, x), emit(cumSum.total);)`

### Session Tracking Examples
**Purpose**: Shows time-based session management
- **JavaScript API**: `session-tracking-example.js`
- **Query Language**: `session-tracking-query-example.js`
- **Features**: Multi-step logic, session start detection, timeout conditions
- **ADX Equivalent**: Scan with temporal conditions (`Ts - s1.Ts < 5m`)

### Basic Sequence Detection (`basic-sequence-query-example.js`)
**Purpose**: Demonstrates start-stop sequence detection
- **Features**: Two-step pattern matching, state storage, completion detection
- **Query**: Start events store user info, stop events emit completion
- **ADX Equivalent**: Basic scan with two steps

### Error Pattern Detection (`error-pattern-query-example.js`)
**Purpose**: Log analysis with error counting
- **Features**: Conditional filtering, cumulative counting, enriched output
- **Query**: `LogEvents | scan (step errorCounter: level == "error" => ...)`
- **Use Case**: Monitoring consecutive errors in log streams

### User Activity Tracking (`user-activity-query-example.js`)
**Purpose**: Complex session management with user-specific tracking
- **Features**: Login/logout detection, activity counting, timeout handling
- **Query**: Multi-step user session lifecycle management
- **Use Case**: Web analytics, user behavior tracking

## Running the Examples

### Original JavaScript API Examples
```bash
bun run examples/scan/cumulative-example.js
bun run examples/scan/session-tracking-example.js
```

### Query Language Examples
```bash
bun run examples/scan/cumulative-query-example.js
bun run examples/scan/session-tracking-query-example.js
bun run examples/scan/basic-sequence-query-example.js
bun run examples/scan/error-pattern-query-example.js
bun run examples/scan/user-activity-query-example.js
```

## Query Language Features Demonstrated

### Basic Scan Syntax
```kusto
data | scan (
    step stepName: condition => 
        stepName.variable = expression,
        emit(value);
)
```

### Key Features
1. **Step Conditions**: `step stepName: condition => ...`
2. **State Management**: `stepName.variable = value`
3. **IFF Function**: `iff(condition, true_value, false_value)`
4. **Emit Function**: `emit(single_value)` - returns value from scan
5. **Variable Scoping**: 
   - `stepName.variable` → step-scoped state
   - `variable` → current row data

### Transpilation
Query language examples show both:
- The Kusto-like query syntax
- The transpiled JavaScript using `ScanOperator`
- Live execution with real data

## Key Differences from ADX

1. **Output Control**: Our implementation currently always outputs matching records (equivalent to `output=all`). ADX supports `output=all`, `output=last`, and `output=none`.

2. **Multi-Step Syntax**: The query language currently supports single-step scan operations. Multi-step examples use multiple `.addStep()` calls in the manual implementation.

3. **Data Types**: JavaScript types vs. ADX datetime types.

## ADX Scan Logic Implementation

Our implementation follows the ADX scan logic:

1. **Check 1**: If previous step has active sequence AND current condition is met → promote state
2. **Check 2**: If current step has active sequence (or is first step) AND condition is met → update state
3. **State Management**: Proper state promotion and replacement as per ADX specification
4. **Match ID**: Incremented when first step matches (new sequence begins)

## Expected Outputs

Each example includes expected output and demonstrates specific scan operator patterns commonly used in stream processing and event analysis. 