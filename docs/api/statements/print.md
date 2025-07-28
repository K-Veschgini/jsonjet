# .print Statement

The `.print` statement prints the result of an expression.

## Syntax

```jsonjet
.print <expression>
```

## Description

The `.print` statement evaluates an expression and prints the result to the console. This is useful for debugging, testing expressions, and displaying computed values.

## Parameters

- `expression`: Any valid JSONJet expression to evaluate and print

## Examples

### Basic Printing

```jsonjet
.print "Hello World"
.print 2 + 2
.print { message: "test", value: 42 }
```

### Expression Evaluation

```jsonjet
.print 10 * 5 + 3
.print "Current time: " + now()
.print { computed: 2 * 3, result: 6 }
```

### Complex Expressions

```jsonjet
.print { 
  greeting: "Hello", 
  user: "Alice", 
  timestamp: now(),
  computed: 2 + 2 * 3
}
```

### Function Calls

```jsonjet
.print length("Hello World")
.print to_upper("hello")
.print format_date(now(), "YYYY-MM-DD")
```

## Output Format

The result is printed as JSON to the console:
```
"Hello World"
4
{ "message": "test", "value": 42 }
```

## Use Cases

### Debugging
Print intermediate values during debugging.

### Testing
Test expressions and function calls.

### Development
Verify expression evaluation during development.

### Documentation
Demonstrate expression results in documentation.

## Related Statements

- [subscribe](./subscribe.md) - Subscribe to stream data
- [list](./list.md) - List system entities 