# ResonanceDB Server

A Bun-based HTTP and WebSocket server for ResonanceDB that provides real-time query execution and stream subscriptions.

## Features

- **HTTP API** for executing queries and commands
- **WebSocket** for real-time stream subscriptions
- **CORS enabled** for browser integration
- **Stream management** with live data flow
- **Query execution** with the full JSDB query language

## Installation

```bash
cd packages/server
bun install
```

## Usage

### Starting the Server

```bash
# Start the server
bun start

# Or run in development mode with hot reload
bun dev

# Build a standalone binary
bun run build

# Build and run the binary
bun run build:run
```

The server will start on `http://localhost:3000` by default.

### Standalone Binary

You can compile the server into a standalone executable:

```bash
bun run build
```

This creates a `resonancedb-server` binary (~59MB) that includes the entire runtime and can be distributed without requiring Bun to be installed on the target system.

### HTTP API Endpoints

#### POST /api/execute
Execute a query or command.

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"query": "create stream users"}'
```

#### GET /api/streams
List all available streams.

```bash
curl http://localhost:3000/api/streams
```

#### GET /api/status
Get server status and metrics.

```bash
curl http://localhost:3000/api/status
```

### WebSocket API

Connect to `ws://localhost:3000/ws` for **real-time stream subscriptions only**.

> **Design Note:** WebSockets are used exclusively for streaming data from subscriptions. All other operations (queries, commands, stream management) use the HTTP API for proper request-response handling.

#### Subscribe to a Stream

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  // Subscribe to a stream
  ws.send(JSON.stringify({
    type: 'subscribe',
    streamName: 'users'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'data') {
    console.log('Stream data:', message.data);
  }
};
```

#### Unsubscribe

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  subscriptionId: 123
}));
```

## Example Usage

1. **Create a stream:**
   ```bash
   curl -X POST http://localhost:3000/api/execute \
     -H "Content-Type: application/json" \
     -d '{"query": "create stream users"}'
   ```

2. **Subscribe to the stream via WebSocket (for real-time data):**
   ```javascript
   const ws = new WebSocket('ws://localhost:3000/ws');
   ws.send(JSON.stringify({type: 'subscribe', streamName: 'users'}));
   
   ws.onmessage = (event) => {
     const message = JSON.parse(event.data);
     if (message.type === 'data') {
       console.log('Live data:', message.data);
     }
   };
   ```

3. **Insert data via HTTP and see it flow in real-time via WebSocket:**
   ```bash
   curl -X POST http://localhost:3000/api/execute \
     -H "Content-Type: application/json" \
     -d '{"query": "insert into users {\"name\": \"Alice\", \"age\": 30}"}'
   ```

## Testing

Run the included test to verify functionality:

```bash
bun run test.js
```

The test demonstrates:
- HTTP API functionality
- Stream creation and management
- WebSocket connections
- Real-time data streaming

## WebSocket Message Types

### Client → Server

- `subscribe`: Subscribe to a stream
- `unsubscribe`: Unsubscribe from a stream

### Server → Client

- `connected`: Connection established
- `subscribed`: Successfully subscribed to a stream
- `unsubscribed`: Successfully unsubscribed  
- `data`: Stream data message (the main purpose!)
- `error`: Error message

> **Note:** Query execution, stream creation, and other operations with return values should use the HTTP API endpoints. 