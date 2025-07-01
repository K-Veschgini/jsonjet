# Scan Operator Examples

This directory contains JavaScript implementations of the examples from the [Microsoft ADX scan operator documentation](https://learn.microsoft.com/en-us/kusto/query/scan-operator?view=microsoft-fabric).

## Examples

### Example 1: Basic Sequence Detection (`example1-basic-sequence.js`)
- **Purpose**: Demonstrates basic Start-Stop sequence detection
- **Features**: Simple condition matching without assignments
- **ADX Equivalent**: Basic scan with two steps

### Example 2: Time-based Conditions (`example2-time-based-conditions.js`)
- **Purpose**: Shows time-based conditions with match ID assignments
- **Features**: Time difference calculations, match ID tracking
- **ADX Equivalent**: Scan with temporal conditions (`Ts - s1.Ts < 5m`)

### Example 3: Declared Variables (`example3-declare-variables.js`)
- **Purpose**: Demonstrates using declared variables for state management
- **Features**: Variable declarations, user session tracking, action counting
- **ADX Equivalent**: Scan with `declare` clause

### Example 4: Detailed Walkthrough (`example4-detailed-walkthrough.js`)
- **Purpose**: Exactly matches the detailed walkthrough from Microsoft documentation
- **Features**: Step-by-step processing demonstration, state tracking
- **ADX Equivalent**: The complete walkthrough example with expected output

### Example 5: Output Control (`example5-output-control.js`)
- **Purpose**: Demonstrates output control concepts
- **Features**: Shows current behavior (output=all equivalent)
- **Note**: Our implementation currently always outputs matching records

## Running the Examples

```bash
# Run individual examples
node examples/scan/example1-basic-sequence.js
node examples/scan/example2-time-based-conditions.js
node examples/scan/example3-declare-variables.js
node examples/scan/example4-detailed-walkthrough.js
node examples/scan/example5-output-control.js
```

## Key Differences from ADX

1. **Output Control**: Our implementation currently always outputs matching records (equivalent to `output=all`). ADX supports `output=all`, `output=last`, and `output=none`.

2. **Syntax**: JavaScript function-based API vs. ADX query language syntax.

3. **Data Types**: JavaScript Date objects vs. ADX datetime types.

## ADX Scan Logic Implementation

Our implementation follows the ADX scan logic:

1. **Check 1**: If previous step has active sequence AND current condition is met → promote state
2. **Check 2**: If current step has active sequence (or is first step) AND condition is met → update state
3. **State Management**: Proper state promotion and replacement as per ADX specification
4. **Match ID**: Incremented when first step matches (new sequence begins)

## Expected Outputs

Each example includes the expected output that should match the ADX behavior described in the Microsoft documentation. 