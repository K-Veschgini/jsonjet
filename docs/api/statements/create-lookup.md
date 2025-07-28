# create lookup Statement

The `create lookup` statement creates a lookup definition for key-value storage.

## Syntax

```jsonjet
create lookup <name> = <value>
create or replace lookup <name> = <value>
```

## Description

The `create lookup` statement defines a named lookup that stores key-value pairs for use in queries. Lookups provide a way to store configuration data, reference tables, and other static data that can be accessed during query processing.

## Parameters

- `name`: Lookup identifier (must be a valid identifier)
- `value`: JSON value (object, array, string, number, boolean)

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

Lookups can be referenced in queries using the `lookup()` function:

```jsonjet
| where retry_count < lookup("max_retries")
| select { status: status, config: lookup("config") }
```

## Use Cases

### Configuration Storage
Store application configuration values.

### Reference Data
Store lookup tables and reference data.

### Feature Flags
Store feature flags and settings.

### Validation Rules
Store validation rules and constraints.

### Static Data
Store any static data needed during processing.

## Related Statements

- [delete lookup](./delete-lookup.md) - Remove a lookup
- [list](./list.md) - List all lookups 