# select Operator

The `select` operator transforms and projects document fields.

## Syntax

```jsonjet
| select { <field_mappings> }
```

## Description

The `SELECT` operator transforms documents by projecting specific fields, computing new values, and restructuring the document shape. It's the primary operator for data transformation.

## Field Mappings

### Basic Field Mapping

```jsonjet
field: expression
```

Maps a field to the result of an expression.

### Shorthand Field Mapping

```jsonjet
field
```

Shorthand for `field: field` - includes the field as-is.

### Spread All Fields

```jsonjet
...*
```

Includes all fields from the source document.

### Spread Expression

```jsonjet
...expression
```

Spreads all fields from the result of an expression.

### Field Exclusion

```jsonjet
-field
```

Excludes a field from the output.

## Examples

### Basic Projection

```jsonjet
| select { id: id, name: name, age: age }
| select { id, name, age }  // Shorthand
| select { id, name, computed_age: age + 1 }
```

### Field Transformation

```jsonjet
| select { 
    id, 
    temp_celsius: temperature,
    temp_fahrenheit: temperature * 1.8 + 32,
    is_hot: temperature > 25
  }
```

### Spread Operations

```jsonjet
| select { id, ...* }  // Include id plus all other fields
| select { ...*, alert: true }  // All fields plus alert
| select { ...user, user_id: user.id }  // Spread user object plus user_id
```

### Field Exclusion

```jsonjet
| select { ...*, -internal_field }  // All fields except internal_field
| select { id, name, -password, -secret }  // Include id, name, exclude sensitive fields
```

### Complex Transformations

```jsonjet
| select {
    id,
    location: { lat: latitude, lng: longitude },
    status: if(active, "online", "offline"),
    metadata: { ...config, timestamp: now() }
  }
```

### Array and Object Operations

```jsonjet
| select {
    id,
    first_item: items[0],
    item_count: items.length,
    user_info: { ...user, display_name: user.first_name + " " + user.last_name }
  }
```

### Conditional Field Inclusion

```jsonjet
| select {
    id,
    ...(include_details ? { details: full_details } : {}),
    ...(is_admin ? { admin_data: sensitive_data } : {})
  }
```

## Advanced Patterns

### Nested Object Restructuring

```jsonjet
| select {
    id,
    contact: {
      email: user.email,
      phone: user.phone,
      address: { ...user.address }
    },
    preferences: { ...user.preferences }
  }
```

### Array Transformations

```jsonjet
| select {
    id,
    tags: tags.map(tag => tag.name),
    scores: scores.filter(score => score > 0),
    total: items.reduce((sum, item) => sum + item.value, 0)
  }
```

### Computed Fields with Functions

```jsonjet
| select {
    id,
    name,
    name_length: length(name),
    upper_name: to_upper(name),
    created_date: format_date(timestamp, "YYYY-MM-DD")
  }
```

## Performance Considerations

- Field exclusion (`-field`) is efficient for large documents
- Spread operations (`...*`) can be expensive with large objects
- Complex expressions are evaluated for each document
- Consider using multiple SELECT operators for complex transformations

## Related Operators

- [WHERE](./where.md) - Filter documents before transformation
- [SUMMARIZE](./summarize.md) - Aggregate data with field projection 