# Kusto to JavaScript Transpiler

This transpiler converts parsed Kusto-like queries into executable JavaScript code using Chevrotain's visitor pattern.

## Features

The transpiler converts Kusto query operations into equivalent JavaScript array methods:

- **Source references** → Direct variable access: `users`
- **WHERE clauses** → `.filter()` with arrow functions: `users.filter(row => row.age > 25)`
- **PROJECT clauses** → `.map()` with object creation: `users.map(row => ({ name: row.name, email: row.email }))`
- **SCAN clauses** → `.pipe(new ScanOperator())` with step definitions: `users.pipe(new ScanOperator().addStep(...))`
- **IFF functions** → Ternary operators: `iff(condition, true_val, false_val)` → `condition ? true_val : false_val`
- **EMIT functions** → Return statements: `emit(value)` → `return value`
- **Complex expressions** → JavaScript boolean logic with proper operator precedence

## Usage

### Basic Transpilation

```javascript
import { transpileQuery } from './src/parser/query-transpiler.js';

const result = transpileQuery('users | where age > 25 | project name, email');
console.log(result.javascript);
// Output: users.filter(row => row.age > 25).map(row => ({ name: row.name, email: row.email }))
```

### Executable Functions

```javascript
import { createQueryFunction } from './src/parser/query-transpiler.js';

const queryFunc = createQueryFunction('users | where active == true');
const users = [
    { name: "Alice", age: 25, active: true },
    { name: "Bob", age: 30, active: false }
];

const result = queryFunc.execute(users);
// Returns: [{ name: "Alice", age: 25, active: true }]
```

## Query to JavaScript Translation Examples

| Kusto Query | Generated JavaScript |
|-------------|---------------------|
| `users` | `users` |
| `users \| where age > 25` | `users.filter(row => row.age > 25)` |
| `users \| project name, email` | `users.map(row => ({ name: row.name, email: row.email }))` |
| `events \| where type == "error"` | `events.filter(row => row.type === "error")` |
| `users \| where active == true` | `users.filter(row => row.active === true)` |
| `users \| where iff(age > 25, true, false) == true` | `users.filter(row => (row.age > 25 ? true : false) === true)` |
| `events \| where iff(type == "error", "critical", "normal") == "critical"` | `events.filter(row => (row.type === "error" ? "critical" : "normal") === "critical")` |
| `users \| scan (step s1: age > 25 => s1.count = s1.count + 1;)` | `users.pipe(new ScanOperator().addStep('s1', (state, row) => row.age > 25, (state, row) => { ... }))` |
| `events \| scan (step s1: type == "error" => emit(s1.count);)` | `events.pipe(new ScanOperator().addStep('s1', (state, row) => row.type === "error", (state, row) => { ... }))` |
| `events \| where (type == "error" or type == "warning") and timestamp > 123` | `events.filter(row => (((row.type === "error") \|\| (row.type === "warning"))) && (row.timestamp > 123))` |

## Operator Mapping

### Comparison Operators
- `==` → `===` (strict equality)
- `!=` → `!==` (strict inequality)
- `<`, `>`, `<=`, `>=` → Direct mapping

### Logical Operators
- `and` → `&&`
- `or` → `||`
- Parentheses are preserved for grouping

### Data Types
- **String literals**: Preserved as-is (`"hello"`, `'world'`)
- **Number literals**: Direct conversion (`123`, `45.67`)
- **Boolean literals**: Lowercase conversion (`true`, `false`)
- **Identifiers**: Prefixed with `row.` for data access (`age` → `row.age`)

### SCAN Operations

SCAN operations are transpiled to use the actual `ScanOperator` from the streaming infrastructure:

```kusto
users | scan (step s1: age > 25 => s1.count = s1.count + 1;)
```

Transpiles to:
```javascript
users.pipe(new ScanOperator()
    .addStep('s1', 
        (state, row) => row.age > 25,
        (state, row) => {
            if (!state.s1) state.s1 = {};
            state.s1.count = state.s1.count + 1;
            return null;
        }
    ))
```

#### EMIT Function
The `emit()` function in scan operations generates return statements:

```kusto
events | scan (step s1: type == "error" => s1.error_count = s1.error_count + 1, emit(s1.error_count);)
```

Transpiles to:
```javascript
events.pipe(new ScanOperator()
    .addStep('s1', 
        (state, row) => row.type === "error",
        (state, row) => {
            if (!state.s1) state.s1 = {};
            state.s1.error_count = state.s1.error_count + 1;
            return state.s1.error_count;
        }
    ))
```

#### Variable Scoping
- `stepName.variable` → `state.stepName.variable` (step-scoped state)
- `variable` → `row.variable` (current row data)

## Architecture

The transpiler uses Chevrotain's visitor pattern:

1. **Parser** creates a Concrete Syntax Tree (CST)
2. **Visitor** traverses the CST nodes
3. **Code Generation** produces JavaScript strings for each node type
4. **Function Creation** wraps the generated code in executable functions

## Data Format Requirements

The transpiler expects data sources to be arrays of objects:

```javascript
const users = [
    { id: 1, name: "Alice", age: 25, active: true },
    { id: 2, name: "Bob", age: 30, active: false }
];
```

## Error Handling

The transpiler provides detailed error messages for:
- Parse errors in the query syntax
- Missing data sources during execution
- JavaScript compilation errors

## Limitations

Current limitations (can be extended):
- Only supports `where` and `project` operations
- Limited function support (currently only `iff`)
- No aggregation functions (`count`, `sum`, etc.)
- No joins between multiple sources
- No advanced data types (dates, timespan, etc.)
- No nested queries or subexpressions

## Performance

The generated JavaScript code uses native array methods (`filter`, `map`) which are optimized by JavaScript engines. For large datasets, consider:
- Using streaming operations for better memory efficiency
- Adding indexes for frequently filtered columns
- Implementing lazy evaluation for complex query chains

## Examples

See `examples/transpiler-example.js` for comprehensive examples including:
- Transpilation verification
- Execution on sample data
- Data flow demonstrations
- Error handling scenarios 