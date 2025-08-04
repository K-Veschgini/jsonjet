# create flow Statement

The `create flow` statement defines a data processing pipeline with optional TTL.

## Syntax

```jsonjet
create flow <flow_name> as
  <source> | <operation> | ...

create flow <flow_name> ttl(<duration>) as
  <source> | <operation> | ...
```

## Description

This statement creates a continuous data processing pipeline that transforms documents from input streams and routes results to output streams. Flows represent the core computational units in our JSONJet architecture.

## Parameters

- `flow_name`: Identifier for the flow
- `duration`: Optional TTL duration (e.g., "1h", "30m", "3600s")
- `source`: Input stream name
- `operation`: Pipeline operations (where, select, scan, etc.)

## TTL (Time To Live)

The optional `ttl` parameter establishes an automatic termination time. When the duration expires, the system stops and removes the flow.

## Examples

### Basic Flow

```jsonjet
create flow data_processor as
  sensor_data 
  | where temperature > 25 
  | select { id: id, temp: temperature, alert: true } 
  | insert_into(processed_data)
```

### Flow with TTL

```jsonjet
create flow temp_monitor ttl(1h) as
  sensors 
  | where temp > 30 
  | select { alert: true, timestamp }
```

### Complex Flow

```jsonjet
create flow user_analytics as
  user_events
  | where event_type in ("login", "logout", "purchase")
  | select { user_id, event_type, timestamp, ...* }
  | summarize { 
      session_count: count(),
      total_purchases: sum_if(amount, event_type = "purchase")
    } by user_id
  | insert_into(user_metrics)
```

### Multi-Output Flow

```jsonjet
create flow event_router as
  events
  | where type = "error"
  | insert_into(error_stream)
  | where severity > 8
  | insert_into(critical_error_stream)
```

## Flow Behavior

- Flows run continuously and process documents as they arrive
- Each flow operates independently
- Flows can read from one input stream and write to multiple output streams
- Flows with TTL automatically stop after the specified duration
- Multiple flows can read from the same input stream



## Related Statements

- [delete flow](./delete-flow.md) - Stop and remove a flow
- [list](./list.md) - List active flows
- [create stream](./create-stream.md) - Create input/output streams 