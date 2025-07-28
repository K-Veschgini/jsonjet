# WebSocket Message Reference

## Client → Server Messages

| Type | Description | Payload |
|------|-------------|---------|
| `subscribe` | Subscribe to a stream | `{ "type": "subscribe", "streamName": "stream_name" }` |
| `unsubscribe` | Unsubscribe from a stream | `{ "type": "unsubscribe", "subscriptionId": 123 }` |
| `insert` | Insert single record | `{ "type": "insert", "target": "stream_name", "data": {...} }` |
| `batch_insert` | Insert multiple records | `{ "type": "batch_insert", "target": "stream_name", "data": [...] }` |

## Server → Client Messages

| Type | Description | Payload |
|------|-------------|---------|
| `connected` | Connection established | `{ "type": "connected" }` |
| `subscribed` | Successfully subscribed | `{ "type": "subscribed", "streamName": "...", "subscriptionId": 123 }` |
| `data` | Stream data | `{ "type": "data", "streamName": "...", "data": {...}, "subscriptionId": 123 }` |
| `insert_response` | Insert operation result | `{ "type": "insert_response", "success": true, "count": 1, "target": "..." }` |
| `error` | Error message | `{ "type": "error", "message": "..." }` | 