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

See [WebSocket Message Reference](/api/websocket-messages) for detailed message formats. 