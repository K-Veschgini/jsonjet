# insert into Statement

> **Performance Note**: While the `insert into` statement exists and works correctly, it is highly recommended to use the dedicated insert APIs via [HTTP and WebSocket](../../server/http-websocket.md) for production data ingestion, as they are much faster and more efficient. The `insert into` statement is primarily useful for testing and experimentation in the UI.

The `insert into` statement adds data to a stream.

## Syntax

```jsonjet
insert into <stream_name> <json_data>
```

## Description

This statement inserts data into a specified stream, immediately routing it to all active subscribers. The operation follows standard streaming semantics where unsubscribed data is discarded.

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



## Related Statements

- [create stream](./create-stream.md) - Create a stream to insert into
- [subscribe](./subscribe.md) - Listen to a stream
- [flush](./flush.md) - Clear stream data 