# create lookup Statement

The `create lookup` statement creates a lookup definition for key-value storage.

## Syntax

```jsonjet
create lookup <name> = <value>
create or replace lookup <name> = <value>
```

## Description

The `create lookup` statement defines a named lookup that stores configuration data, reference tables, and other static data that can be accessed during query processing. Lookups are designed for runtime configuration values and lookup tables, providing an efficient way to store and access reference data without requiring JOINs.

Lookups are stored in the system registry and persist until explicitly deleted, making them ideal for:
- Configuration parameters (timeouts, thresholds, feature flags)
- Reference tables (status codes, error mappings, validation rules)
- Static data that doesn't change frequently during query execution

## Parameters

- `name`: Lookup identifier (must be a valid identifier)
- `value`: JSON value (object, array, string, number, boolean, null)

## Modifiers

### or replace
Replaces an existing lookup if it exists, otherwise creates a new one.

## Examples

### Basic Lookup Creation

```jsonjet
create lookup max_retries = 3
create lookup timeout = 5000
create lookup debug_mode = true
```

### Object Lookups

```jsonjet
create lookup config = { timeout: 5000, retries: 3 }
create lookup user_settings = { theme: "dark", language: "en" }
```

### Array Lookups

```jsonjet
create lookup valid_statuses = ["active", "pending", "inactive"]
create lookup allowed_ips = ["192.168.1.1", "10.0.0.1"]
```

### With Replace Modifier

```jsonjet
create or replace lookup threshold = 25.5
create or replace lookup config = { new_setting: true }
```

### Complex Lookup Values

```jsonjet
create lookup error_codes = {
  "E001": { message: "Invalid input", severity: "error" },
  "E002": { message: "Timeout", severity: "warning" }
}
```

## Lookup Usage

Lookups can be referenced in queries by name. When a property name is not found in the input data, the system checks if a lookup with that name exists:

```jsonjet
| where retry_count < max_retries
| select { status: status, timeout_value: timeout }
```

**Note**: If your data contains a property with the same name as a lookup, the data property takes precedence.

## Validation

- Lookup names must be valid identifiers (start with letter/underscore, contain only letters, numbers, underscores)
- Lookup names cannot conflict with existing function names
- Values must be valid JSON (object, array, string, number, boolean, null)

## Related Statements

- [delete lookup](./delete-lookup.md) - Remove a lookup
- [list](./list.md) - List all lookups