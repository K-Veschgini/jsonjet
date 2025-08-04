# delete lookup Statement

The `delete lookup` statement removes a lookup definition from the system.

## Syntax

```jsonjet
delete lookup <lookup_name>
```

## Description

This statement permanently removes a named lookup and its associated value. Any subsequent queries referencing the removed lookup will fall back to treating the name as a regular property access.

## Parameters

- `lookup_name`: Name of the lookup to delete (must be a valid identifier)

## Examples

### Basic Lookup Deletion

```jsonjet
delete lookup old_config
delete lookup temp_threshold
delete lookup expired_settings
```

### Cleanup Operations

```jsonjet
delete lookup test_lookup
delete lookup temporary_config
delete lookup deprecated_settings
```

## Behavior

- Removes the lookup and its associated value
- Operation is irreversible
- No impact on streams or flows
- Queries referencing the deleted lookup will treat it as a regular property name

## Related Statements

- [create lookup](./create-lookup.md) - Create a new lookup
- [list](./list.md) - List all lookups