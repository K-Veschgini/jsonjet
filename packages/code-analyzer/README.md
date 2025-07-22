# Code Analyzer

A JavaScript library providing utilities for analyzing JavaScript code using Acorn AST parser.

## Features

- Extracts all external function call names from JavaScript code
- Handles nested function calls (e.g., `f(() => g())`)
- Excludes functions that are defined within the analyzed code
- Supports various call patterns:
  - Direct function calls: `f()`
  - Method calls: `obj.method()` (static property access)
  - Computed property calls: `obj['method']()` (marked as `[DYNAMIC_CALL]`)
  - Dynamic property access: `obj[var]()` or `obj[expr]()` (marked as `[DYNAMIC_CALL]`)
- Returns a sorted array of unique function names
- Security-aware: flags potentially dangerous dynamic function calls

## Installation

```bash
bun install
```

## Usage

```javascript
import { extractExternalFunctionCalls } from '@jsdb/code-analyzer';

const code = `
  function myFunc() { return 42; }
  const result = process(data.map(item => {
    return transform(item.filter(x => x > 0));
  }));
  myFunc();
`;

const externalCalls = extractExternalFunctionCalls(code);
console.log(externalCalls);
// Output: ['filter', 'map', 'process', 'transform']
```

## API

### `extractExternalFunctionCalls(code: string): string[]`

Extracts external function call names from JavaScript code.

**Parameters:**
- `code` (string): JavaScript code to analyze

**Returns:**
- `string[]`: Array of external function call names, sorted alphabetically

**Throws:**
- `Error`: If the code cannot be parsed by Acorn

## Examples

### Simple function calls
```javascript
const code = 'f(); g(); h();';
extractExternalFunctionCalls(code);
// Returns: ['f', 'g', 'h']
```

### Nested function calls
```javascript
const code = 'f(() => g(() => h()));';
extractExternalFunctionCalls(code);
// Returns: ['f', 'g', 'h']
```

### Excluding defined functions
```javascript
const code = `
  function myFunc() { return 42; }
  const arrowFunc = () => {};
  myFunc();
  arrowFunc();
  externalFunc();
`;
extractExternalFunctionCalls(code);
// Returns: ['externalFunc']
```

### Computed property calls (security risk)
```javascript
const code = "obj['method'](); arr['filter'](x => x > 0);";
extractExternalFunctionCalls(code);
// Returns: ['[DYNAMIC_CALL]']
```

### Dynamic property access (high security risk)
```javascript
const code = "obj[getMethodName()](); arr[someVar]();";
extractExternalFunctionCalls(code);
// Returns: ['[DYNAMIC_CALL]', 'getMethodName']
```

## Testing

```bash
bun test.js
```

## License

MIT 