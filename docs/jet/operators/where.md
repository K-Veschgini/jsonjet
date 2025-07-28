# where Operator

The `where` operator filters documents based on boolean expressions.

## Syntax

```jsonjet
| where <expression>
```

## Description

The `WHERE` operator filters the input stream to only include documents where the specified expression evaluates to `true`. It's one of the most commonly used operators for data filtering.

## Parameters

- `expression`: A boolean expression that determines which documents to include

## Expression Types

### Comparison Operators

- `=` - Equal to
- `!=` - Not equal to  
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal to
- `<=` - Less than or equal to

### Logical Operators

- `and` - Logical AND
- `or` - Logical OR
- `not` - Logical NOT

### Field Access

- `field_name` - Direct field access
- `object.field` - Nested field access
- `array[index]` - Array element access

## Examples

### Basic Comparisons

```jsonjet
| where temperature > 25
| where status = "active"
| where count <= 100
| where name != "unknown"
```

### Logical Combinations

```jsonjet
| where temperature > 25 and humidity < 60
| where status = "error" or severity > 5
| where not is_deleted
| where (type = "login" or type = "logout") and user_id = 123
```

### Field Access

```jsonjet
| where user.name = "alice"
| where sensors[0].value > 30
| where config.timeout > 5000
```

### Complex Conditions

```jsonjet
| where timestamp > now() - 1h
| where array_length(items) > 0
| where exists(error_code)
| where temperature * 1.8 + 32 > 100
```

### Null and Undefined Checks

```jsonjet
| where field is not null
| where optional_field is defined
| where required_field is not undefined
```

## Performance Notes

- Use indexed fields when possible for better performance
- Complex expressions may impact processing speed
- Consider using multiple WHERE clauses in sequence for complex logic

## Related Operators

- [SELECT](./select.md) - Project and transform fields
- [SCAN](./scan.md) - Stateful processing with conditions 