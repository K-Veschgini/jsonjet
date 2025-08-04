# HTTP and WebSocket APIs

JSONJet provides both HTTP and WebSocket APIs for different use cases.

## HTTP API

The HTTP API is used for executing commands and queries.

### Endpoint

```
POST http://localhost:3333/api/execute
```

### Request Format

```json
{
  "query": "create stream sensor_data"
}
```

### Response Format

```json
{
  "success": true,
  "result": "..."
}
```

## WebSocket API

The WebSocket API is used for real-time operations like stream subscriptions and data insertion.

### Connection

```
ws://localhost:3333/ws
```

### Message Types

All messages support an optional `requestId` field for correlating requests with responses.

#### Client → Server Messages

| Type | Description | Payload |
|------|-------------|---------|
| `subscribe` | Subscribe to one or more streams | `{ "type": "subscribe", "streamName": "stream_name" \| ["stream1", "stream2"], "requestId": "optional" }` |
| `unsubscribe` | Unsubscribe from specific subscription or all | `{ "type": "unsubscribe", "subscriptionId": 123, "requestId": "optional" }` (omit subscriptionId to unsubscribe from all) |
| `insert` | Insert single record or batch | `{ "type": "insert", "target": "stream_name", "data": {...} \| [...], "requestId": "optional" }` |
| `execute` | Execute JET query/command | `{ "type": "execute", "query": "create stream my_stream", "requestId": "optional" }` |

#### Server → Client Messages

| Type | Description | Payload |
|------|-------------|---------|
| `connected` | Connection established | `{ "type": "connected", "clientId": 123 }` |
| `subscribed` | Successfully subscribed | `{ "type": "subscribed", "subscriptions": [{"streamName": "...", "subscriptionId": 123}], "requestId": "..." }` |
| `unsubscribed` | Successfully unsubscribed | `{ "type": "unsubscribed", "subscriptionId": 123, "streamName": "...", "requestId": "..." }` (or array for bulk unsubscribe) |
| `data` | Stream data | `{ "type": "data", "streamName": "...", "data": {...}, "subscriptionId": 123, "requestId": "..." }` |
| `insert_response` | Insert operation result | `{ "type": "insert_response", "success": true, "count": 1, "target": "...", "requestId": "..." }` |
| `execute_response` | Execute operation result | `{ "type": "execute_response", "success": true, "result": {...}, "requestId": "..." }` |
| `error` | Error message | `{ "type": "error", "message": "...", "requestId": "..." }` | 

### Examples

#### Subscribe to Single Stream
```json
// Client → Server
{
  "type": "subscribe",
  "streamName": "sensor_data",
  "requestId": "req_001"
}

// Server → Client
{
  "type": "subscribed",
  "subscriptions": [{"streamName": "sensor_data", "subscriptionId": 1}],
  "message": "Subscribed to 1 stream(s)",
  "requestId": "req_001"
}
```

#### Subscribe to Multiple Streams
```json
// Client → Server
{
  "type": "subscribe", 
  "streamName": ["sensor_data", "alerts"],
  "requestId": "req_002"
}

// Server → Client
{
  "type": "subscribed",
  "subscriptions": [
    {"streamName": "sensor_data", "subscriptionId": 2},
    {"streamName": "alerts", "subscriptionId": 3}
  ],
  "message": "Subscribed to 2 stream(s)",
  "requestId": "req_002"
}
```

#### Insert Single Record
```json
// Client → Server
{
  "type": "insert",
  "target": "sensor_data",
  "data": {"sensor_id": "sensor_1", "temperature": 23.5},
  "requestId": "req_003"
}

// Server → Client
{
  "type": "insert_response",
  "success": true,
  "count": 1,
  "target": "sensor_data",
  "message": "1 record(s) inserted successfully into 'sensor_data'",
  "requestId": "req_003"
}
```

#### Insert Multiple Records (Batch)
```json
// Client → Server
{
  "type": "insert",
  "target": "sensor_data", 
  "data": [
    {"sensor_id": "sensor_1", "temperature": 23.5},
    {"sensor_id": "sensor_2", "temperature": 24.1}
  ],
  "requestId": "req_004"
}

// Server → Client
{
  "type": "insert_response",
  "success": true,
  "count": 2,
  "target": "sensor_data",
  "message": "2 record(s) inserted successfully into 'sensor_data'",
  "requestId": "req_004"
}
```

#### Execute Query/Command
```json
// Client → Server
{
  "type": "execute",
  "query": "create stream new_stream",
  "requestId": "req_005"
}

// Server → Client
{
  "type": "execute_response",
  "success": true,
  "result": {"success": true, "message": "Stream 'new_stream' created"},
  "message": "Query executed successfully",
  "requestId": "req_005"
}
```

#### Unsubscribe from Specific Subscription
```json
// Client → Server
{
  "type": "unsubscribe",
  "subscriptionId": 2,
  "requestId": "req_006"
}

// Server → Client
{
  "type": "unsubscribed",
  "subscriptionId": 2,
  "streamName": "sensor_data",
  "message": "Unsubscribed from subscription 2",
  "requestId": "req_006"
}
```

#### Unsubscribe from All Subscriptions
```json
// Client → Server
{
  "type": "unsubscribe",
  "requestId": "req_007"
}

// Server → Client
{
  "type": "unsubscribed",
  "unsubscribed": [
    {"subscriptionId": 1, "streamName": "sensor_data"},
    {"subscriptionId": 3, "streamName": "alerts"}
  ],
  "message": "Unsubscribed from 2 subscription(s)",
  "requestId": "req_007"
}
```