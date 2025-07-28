# insert into Statement

The `insert into` statement inserts data into a stream.

## Syntax

```jsonjet
insert into <stream_name> <json_data>
```

## Description

The `insert into` statement adds data to a specified stream. The data is immediately routed to all active subscribers of the stream.

## Parameters

- `stream_name`: Target stream identifier
- `json_data`: JSON object, array, or primitive value to insert

## Examples

### Basic Data Insertion

```jsonjet
insert into events { type: "login", user: "alice", timestamp: 1640995200 }
insert into sensor_data { id: "sensor1", temperature: 23.5, humidity: 45 }
insert into logs { level: "info", message: "Application started" }
```

### Array Data

```jsonjet
insert into batch_data [{ id: 1, value: 10 }, { id: 2, value: 20 }]
insert into events [{ type: "click" }, { type: "scroll" }]
```

### Complex Objects

```jsonjet
insert into user_events {
  user_id: "12345",
  event_type: "purchase",
  amount: 99.99,
  items: ["item1", "item2"],
  metadata: { source: "web", session_id: "abc123" }
}
```

### Primitive Values

```jsonjet
insert into heartbeat "alive"
insert into counter 42
insert into status true
```

## Behavior

- Data is sent to the stream immediately
- All active subscribers receive the data
- If no subscribers are listening, data is lost (correct streaming behavior)
- Data is not persisted - streams are not storage
- Multiple documents can be inserted in a single statement

## Use Cases

### Data Ingestion
Insert data from external sources into streams.

### Event Publishing
Publish events to event streams.

### Real-time Updates
Send real-time updates to processing pipelines.

### Testing
Insert test data for development and testing.

### Monitoring
Send monitoring and health check data.

## Related Statements

- [create stream](./create-stream.md) - Create a stream to insert into
- [subscribe](./subscribe.md) - Listen to a stream
- [flush](./flush.md) - Clear stream data 