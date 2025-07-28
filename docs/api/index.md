# JSONJet Reference

This page provides a reference for JSONJet's Kusto-like query language and operations.

## Stream Operations

### CREATE STREAM
Create a new data stream.

```sql
create stream <stream_name>
```

### INSERT
Insert data into a stream.

```sql
insert into <stream_name> <json_data>
```

**Example:**
```sql
insert into events {"type": "login", "user": "alice", "timestamp": 1640995200}
```

## Flow Operations

### CREATE FLOW
Create a data processing flow.

```sql
create flow <flow_name> as <query_pipeline>
```

**Example:**
```sql
create flow user_activity as
  events
  | where type = "login"
  | select { user: user, time: timestamp }
```

## Lookup Operations

### CREATE LOOKUP
Create a lookup definition.

```sql
create lookup <name> = <value>
create or replace lookup <name> = <value>
```

**Examples:**
```sql
create lookup max_retries = 3
create lookup config = {"timeout": 5000, "retries": 3}
create lookup valid_statuses = ["active", "pending", "inactive"]
```

### DELETE LOOKUP
Remove a lookup definition.

```sql
delete lookup <name>
```

### LIST LOOKUPS
Show all defined lookups.

```sql
list lookups
```

## Query Operators

### WHERE
Filter data based on conditions.

```sql
| where <condition>
```

### SELECT
Transform and project data.

```sql
| select { <field_mappings> }
```

**Array Indexing:**
```sql
| select { 
    firstItem: items[0],
    itemCount: items.length 
  }
```

### SCAN
Stateful processing with step definitions.

```sql
| scan(
    step <name>: <initial_value> = <update_expression>,
    emit <condition>
  )
```

This is a basic reference - more detailed documentation will be added as the project grows.