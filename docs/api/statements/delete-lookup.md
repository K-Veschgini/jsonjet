# delete lookup Statement

The `delete lookup` statement removes a lookup definition.

## Syntax

```jsonjet
delete lookup <lookup_name>
```

## Description

The `delete lookup` statement removes a named lookup from the system. This operation is irreversible and any queries that reference the lookup will fail.

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
- Any queries referencing the lookup will fail
- Operation is irreversible
- No impact on streams or flows

## Use Cases

### Configuration Management
Remove lookup configurations that are no longer needed.

### Testing
Clean up test lookups after testing.

### Version Management
Remove deprecated lookup configurations.

### Maintenance
Remove lookups during system maintenance.

## Related Statements

- [create lookup](./create-lookup.md) - Create a new lookup
- [list](./list.md) - List all lookups 