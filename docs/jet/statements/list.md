# list Statement

The `list` statement displays information about system entities.

## Syntax

```jsonjet
list streams
list flows  
list lookups
list subscriptions
```

## Description

This statement queries and displays information about system components. It provides a snapshot of the current state across streams, flows, lookups, and subscriptions.

## Parameters

- `streams` - List all streams with document counts
- `flows` - List all active flows with TTL information
- `lookups` - List all lookup definitions with values
- `subscriptions` - List all active stream subscriptions

## Examples

### List Streams

```jsonjet
list streams
```

**Output:**
```
Found 3 stream(s):
1. sensor_data (150 documents)
2. events (25 documents)
3. logs (1000 documents)
```

### List Flows

```jsonjet
list flows
```

**Output:**
```
Found 2 active flow(s):
1. data_processor: sensor_data -> processed_data
2. temp_monitor: sensors -> alerts (TTL: 3600s remaining)
```

### List Lookups

```jsonjet
list lookups
```

**Output:**
```
Found 2 lookup(s):
1. max_retries = 3
2. config = {"timeout": 5000, "retries": 3}
```

### List Subscriptions

```jsonjet
list subscriptions
```

**Output:**
```
Found 1 active subscription(s):
1. ID 123: sensor_data
```



## Related Statements

- [info](./info.md) - Get detailed information about streams
- [create stream](./create-stream.md) - Create streams to list
- [create flow](./create-flow.md) - Create flows to list
- [create lookup](./create-lookup.md) - Create lookups to list 