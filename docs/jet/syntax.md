# JSONJet Syntax Reference

This page documents the complete syntax of the JSONJet query language as defined in the core package grammar.

## Table of Contents

- [Statements](#statements)
- [Expressions](#expressions)
- [Object Literals](#object-literals)
- [Array Literals](#array-literals)
- [Pipeline Queries](#pipeline-queries)
- [Operators](#operators)
- [Literals](#literals)
- [Identifiers](#identifiers)
- [Comments](#comments)

## Statements

### Program Structure

A JSONJet program consists of one or more statements separated by semicolons:

```jsonjet
statement1;
statement2;
statement3;
```

### Command Statements

#### Create Statements

```jsonjet
// Create stream
create stream streamName;

// Create flow with TTL
create flow flowName ttl(duration) as pipelineQuery;

// Create flow without TTL
create flow flowName as pipelineQuery;

// Create lookup
create lookup lookupName = expression;

// Create with OR REPLACE
create or replace stream streamName;

// Create with IF NOT EXISTS
create if not exists stream streamName;
```

#### Delete Statements

```jsonjet
delete stream streamName;
delete flow flowName;
delete lookup lookupName;
```

#### Insert Statements

```jsonjet
insert into streamName expression;
```

#### Flush Statements

```jsonjet
flush streamName;
```

#### List Statements

```jsonjet
list;
list stream;
list flow;
list lookup;
list streams;
list flows;
list lookups;
```

#### Info Statements

```jsonjet
info;
info streamName;
```

#### Subscribe/Unsubscribe Statements

```jsonjet
subscribe streamName;
unsubscribe subscriptionId;
```

### Dot Commands

```jsonjet
.commandName arg1 arg2 "string arg" { object: value } [ array, values ];
```

### Print Commands

```jsonjet
print expression;
```

## Expressions

### Expression Hierarchy

Expressions follow this precedence order (highest to lowest):

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

### Ternary Expressions

```jsonjet
condition ? trueValue : falseValue
```

### Logical Expressions

```jsonjet
// OR expressions
expr1 || expr2 || expr3

// AND expressions
expr1 && expr2 && expr3
```

### Comparison Expressions

```jsonjet
expr1 == expr2    // Equal
expr1 != expr2    // Not equal
expr1 < expr2     // Less than
expr1 > expr2     // Greater than
expr1 <= expr2    // Less than or equal
expr1 >= expr2    // Greater than or equal
```

### Arithmetic Expressions

```jsonjet
expr1 + expr2     // Addition
expr1 - expr2     // Subtraction
expr1 * expr2     // Multiplication
expr1 / expr2     // Division
```

### Unary Expressions

```jsonjet
+expression       // Unary plus
-expression       // Unary minus
```

### Function Calls

```jsonjet
// Scalar functions
functionName(arg1, arg2, arg3)

// IFF function
iff(condition, trueValue, falseValue)

// EMIT function
emit(value)
emit(arg1, arg2, arg3)
```

### Step Variables

```jsonjet
stepName
stepName.variableName
```

## Object Literals

### Basic Object Syntax

```jsonjet
{ }
{ property1, property2, property3 }
{ key1: value1, key2: value2 }
```

### Property Types

#### Key-Value Pairs

```jsonjet
{ key: value }
{ "string key": value }
{ keyword: value }  // Keywords allowed as property names
```

#### Shorthand Properties

```jsonjet
{ propertyName }  // Equivalent to { propertyName: propertyName }
```

#### Spread Syntax

```jsonjet
{ ...* }                    // Spread all properties
{ ...expression }           // Spread properties from expression
{ ...object1, ...object2 }  // Spread multiple objects
```

#### Exclusion Syntax

```jsonjet
{ ...*, -excludedField }    // Include all except excludedField
{ field1, field2, -field3 } // Include field1, field2, exclude field3
```

### Property Keys

Property keys can be:
- **Identifiers**: `fieldName`
- **String literals**: `"field name"`
- **Keywords**: `where`, `select`, `scan`, etc.

## Array Literals

### Basic Array Syntax

```jsonjet
[ ]
[ element1, element2, element3 ]
[ expression1, expression2, expression3 ]
```

## Pipeline Queries

### Basic Pipeline

```jsonjet
source | operation1 | operation2 | operation3
```

### Source

The source can be:
- **Identifier**: `streamName`
- **Keywords**: `where`, `select`, `scan`, `summarize`, `collect`, `stream`, `flow`

### Operations

#### WHERE Clause

```jsonjet
where expression
```

#### SELECT Clause

```jsonjet
select { 
  field1,                    // Shorthand property
  field2: expression,        // Key-value property
  ...*,                      // Spread all
  ...objectExpression,       // Spread object
  -excludedField             // Exclude field
}
```

#### SCAN Clause

```jsonjet
scan { 
  step1: condition1 => statement1,
  step2: condition2 => statement2, statement3;
  step3: condition3 => statement4
}
```

#### SUMMARIZE Clause

```jsonjet
summarize { 
  field1: aggregation1,
  field2: aggregation2,
  ...*,
  ...objectExpression,
  -excludedField
}
by groupField1, groupField2
over windowDefinition
```

#### Window Definitions

```jsonjet
windowName = hopping_window(duration, hop)
windowName = tumbling_window(duration)
windowName = sliding_window(duration, slide)
windowName = count_window(count)
windowName = hopping_window_by(duration, hop, field)
windowName = tumbling_window_by(duration, field)
windowName = sliding_window_by(duration, slide, field)
windowName = session_window(timeout)
```

#### EMIT Clause

```jsonjet
emit every duration
emit when condition
emit on change
emit every time
emit sum
```

#### INSERT INTO Clause

```jsonjet
insert_into(targetStream)
```

#### WRITE TO FILE Clause

```jsonjet
write_to_file(filename)
```

#### ASSERT OR SAVE EXPECTED Clause

```jsonjet
assert_or_save_expected(expectedValue)
```

#### COLLECT Clause

```jsonjet
collect
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

### Assignment and Flow Operators

```jsonjet
=     // Assignment
=>    // Arrow (used in scan steps)
|     // Pipeline
```

### Special Operators

```jsonjet
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

#### Declaration Keywords
```jsonjet
create, insert, delete, flush, list, info, subscribe, unsubscribe, print
```

#### Flow Keywords
```jsonjet
stream, flow, lookup, as, into, ttl
```

#### Query Keywords
```jsonjet
where, select, scan, summarize, collect, by, over, step, emit
```

#### Control Keywords
```jsonjet
or, replace, if, not, exists, every, when, on, change, group, update, using
```

#### Window Keywords
```jsonjet
hopping_window, tumbling_window, sliding_window, count_window
hopping_window_by, tumbling_window_by, sliding_window_by, session_window
```

#### Logical Keywords
```jsonjet
and, or, not, if
```

#### Special Functions
```jsonjet
iff, assert_or_save_expected, write_to_file, insert_into
```

## Comments

### Single-line Comments

```jsonjet
// This is a comment
```

Comments start with `//` and continue to the end of the line.

## Examples

### Complete Flow Definition

```jsonjet
create flow userAnalytics ttl("1h") as
data 
  | where user_id != null
  | select { 
      user_id,
      name: user.name,
      age: user.age,
      is_adult: user.age >= 18,
      ...user.profile,
      -internal_field
    }
  | summarize {
      total_users: count(),
      avg_age: avg(age),
      adult_count: count(iff(is_adult, 1, 0))
    }
  by user.country
  over tumbling_window("5m")
  emit every "1m";
```

### Scan with Steps

```jsonjet
scan {
  login: user.action == "login" => 
    session_id = generate_uuid(),
    login_time = now();
  
  logout: user.action == "logout" => 
    session_duration = now() - login_time,
    emit({ user_id, session_duration });
}
```

### Complex Object with Spreads

```jsonjet
select {
  ...user.basic_info,
  ...user.preferences,
  computed_age: user.birth_date ? age_from_date(user.birth_date) : null,
  -password_hash,
  -internal_metadata
}
``` 