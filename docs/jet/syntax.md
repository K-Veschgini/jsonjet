# JSONJet Syntax Reference

This page provides a concise overview of JSONJet syntax. For detailed information about specific operators and statements, see the individual documentation pages:

- **Statements**: See the [statements](./statements/) directory for detailed documentation of each statement type
- **Operators**: See the [operators](./operators/) directory for detailed documentation of each operator

## Table of Contents

- [Program Structure](#program-structure)
- [Expressions](#expressions)
- [Object and Array Literals](#object-and-array-literals)
- [Flow Definitions](#flow-definitions)
- [Operators](#operators)
- [Literals](#literals)
- [Identifiers](#identifiers)
- [Comments](#comments)

## Program Structure

A JSONJet program consists of one or more statements separated by semicolons:

```jsonjet
statement1;
statement2;
statement3;
```

Statements are commands that perform actions in JSONJet. See the [statements](./statements/) directory for detailed documentation of each statement type.

## Expressions

### Expression Precedence (highest to lowest)

1. **Unary expressions**: `+expr`, `-expr`
2. **Function calls**: `function(args)`
3. **Object/Array literals**: `{...}`, `[...]`
4. **Step variables**: `step.variable`
5. **Literals**: strings, numbers, booleans, null
6. **Parenthesized expressions**: `(expr)`
7. **Arithmetic**: `*`, `/`, `%`, `+`, `-`
8. **Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`
9. **Logical**: `&&`, `||`
10. **Ternary**: `condition ? trueValue : falseValue`

### Expression Syntax

```jsonjet
// Function calls
functionName(arg1, arg2, arg3)

// Step variables
stepName
stepName.variableName

// Ternary
condition ? trueValue : falseValue

// Logical
expr1 || expr2 || expr3
expr1 && expr2 && expr3

// Comparison
expr1 == expr2    // Equal
expr1 != expr2    // Not equal
expr1 < expr2     // Less than
expr1 > expr2     // Greater than
expr1 <= expr2    // Less than or equal
expr1 >= expr2    // Greater than or equal

// Arithmetic
expr1 + expr2     // Addition
expr1 - expr2     // Subtraction
expr1 * expr2     // Multiplication
expr1 / expr2     // Division
```

## Object and Array Literals

### Object Literals

```jsonjet
{ }                                    // Empty object
{ property1, property2 }               // Shorthand properties
{ key1: value1, key2: value2 }         // Key-value pairs
{ ...* }                               // Spread all properties
{ ...expression }                      // Spread from expression
{ ...*, -excludedField }               // Include all except excluded
{ field1, field2, -field3 }            // Include field1, field2, exclude field3
```

### Array Literals

```jsonjet
[ ]                                    // Empty array
[ element1, element2, element3 ]       // Array with elements
```

## Flow Definitions

### Flow Syntax

```jsonjet
create flow flowName [ttl(duration)] as
  source | operation1 | operation2 | ...
```

### Window Definitions

```jsonjet
window_name = window_type(parameters)
```

## Operators

### Logical Operators
```jsonjet
&&    // Logical AND
||    // Logical OR
```

### Comparison Operators
```jsonjet
==    // Equal
!=    // Not equal
<     // Less than
>     // Greater than
<=    // Less than or equal
>=    // Greater than or equal
```

### Arithmetic Operators
```jsonjet
+     // Addition
-     // Subtraction
*     // Multiplication
/     // Division
```

### Special Operators
```jsonjet
=     // Assignment
=>    // Arrow (used in scan steps)
|     // Pipeline
...   // Spread operator
?     // Question mark (ternary)
```

### Punctuation
```jsonjet
,     // Comma
;     // Semicolon
:     // Colon
.     // Dot
( )   // Parentheses
{ }   // Braces
[ ]   // Brackets
```

## Literals

### String Literals
```jsonjet
"string value"
'string value'
```

### Number Literals
```jsonjet
123
123.456
-123
-123.456
```

### Boolean Literals
```jsonjet
true
false
```

### Null Literal
```jsonjet
null
```

### Duration Literals
```jsonjet
"1s"      // 1 second
"1m"      // 1 minute
"1h"      // 1 hour
"1d"      // 1 day
"1w"      // 1 week
```

## Identifiers

### Identifier Rules
- Start with letter, underscore, or dollar sign
- Can contain letters, digits, underscores
- Case sensitive
- Keywords can be used as identifiers in expressions

### Keywords
Keywords are reserved words in JSONJet. They can be used as identifiers in expressions when needed.

## Comments

### Single-line Comments
```jsonjet
// This is a comment
```

Comments start with `//` and continue to the end of the line. 