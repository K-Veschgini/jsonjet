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

#### Client → Server Messages

| Type | Description | Payload |
|------|-------------|---------|
| `subscribe` | Subscribe to a stream | `{ "type": "subscribe", "streamName": "stream_name" }` |
| `unsubscribe` | Unsubscribe from a stream | `{ "type": "unsubscribe", "subscriptionId": 123 }` |
| `insert` | Insert single record | `{ "type": "insert", "target": "stream_name", "data": {...} }` |
| `batch_insert` | Insert multiple records | `{ "type": "batch_insert", "target": "stream_name", "data": [...] }` |

#### Server → Client Messages

| Type | Description | Payload |
|------|-------------|---------|
| `connected` | Connection established | `{ "type": "connected" }` |
| `subscribed` | Successfully subscribed | `{ "type": "subscribed", "streamName": "...", "subscriptionId": 123 }` |
| `data` | Stream data | `{ "type": "data", "streamName": "...", "data": {...}, "subscriptionId": 123 }` |
| `insert_response` | Insert operation result | `{ "type": "insert_response", "success": true, "count": 1, "target": "..." }` |
| `error` | Error message | `{ "type": "error", "message": "..." }` | 