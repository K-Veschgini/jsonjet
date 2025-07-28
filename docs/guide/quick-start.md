# Quick Start

Get started with JSONJet server using WebSockets for real-time stream processing.

JSONJet provides two APIs:
- **HTTP API** for setup operations (creating streams, flows, lookups)
- **WebSocket API** for real-time operations (data insertion, subscriptions)

## Install and Start JSONJet Server

- Download the latest JSONJet release for your system from [GitHub releases](https://github.com/your-org/jsdb/releases)

## Dependencies

::: code-group

```bash [JavaScript]
# No additional dependencies required
# Uses built-in WebSocket and fetch APIs
```

```bash [Python]
pip install websockets aiohttp
```

:::

## Server Setup

### 1. Start the JSONJet Server

```bash
# Extract the downloaded release
tar -xzf jsonjet-latest.tar.gz
cd jsonjet

# Start the server
./jsonjet-server
```

The server will start on `http://localhost:3333` with WebSocket endpoint at `ws://localhost:3333/ws`.


## Complete Example: Temperature Monitoring

This example demonstrates a complete JSONJet application that:

1. **Creates infrastructure** - Sets up streams and a processing flow
2. **Connects to WebSocket** - Establishes real-time communication
3. **Subscribes to alerts** - Listens for filtered data
4. **Sends mock sensor data** - Simulates temperature readings
5. **Processes data in real-time** - Filters temperatures above 25°C and generates alerts

The flow filters sensor data and only alerts when temperature exceeds 25°C, showing how JSONJet can process streaming data in real-time.



::: code-group

```javascript [JavaScript]
// Step 1: Create infrastructure via HTTP API
await fetch('http://localhost:3333/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'create stream sensor_data' })
});
await fetch('http://localhost:3333/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'create stream alerts' })
});
await fetch('http://localhost:3333/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    query: `create flow monitor as
  sensor_data
  | where temperature > 25
  | select { id, temp: temperature, alert: true }
  | insert_into(alerts)` 
  })
});

// Step 2: Connect to WebSocket for real-time operations
const ws = new WebSocket('ws://localhost:3333/ws');
ws.onopen = () => {
  // Subscribe to alerts stream to receive filtered data
  ws.send(JSON.stringify({ type: 'subscribe', streamName: 'alerts' }));
  
  // Mock sensor data generation (every 2 seconds)
  // In production, replace with real sensor readings
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'insert',
      target: 'sensor_data',
      data: { id: 'sensor1', temperature: 20 + Math.random() * 15 }
    }));
  }, 2000);
};

// Step 3: Handle incoming alert messages
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.type === 'data') console.log(m.data); // Print alerts when temp > 25
};
```

```python [Python]
import asyncio, websockets, json, random, aiohttp

async def setup():
    # Step 1: Create infrastructure via HTTP API
    async with aiohttp.ClientSession() as s:
        # Create input stream for sensor data
        await s.post('http://localhost:3333/api/execute', json={'query': 'create stream sensor_data'})
        # Create output stream for alerts
        await s.post('http://localhost:3333/api/execute', json={'query': 'create stream alerts'})
        # Create processing flow that filters and transforms data
        await s.post('http://localhost:3333/api/execute', json={
            'query': 'create flow monitor as\n  sensor_data\n  | where temperature > 25\n  | select { id, temp: temperature, alert: true }\n  | insert_into(alerts)'
        })

async def main():
    await setup()
    
    # Step 2: Connect to WebSocket for real-time operations
    ws = await websockets.connect('ws://localhost:3333/ws')
    # Subscribe to alerts stream to receive filtered data
    await ws.send(json.dumps({"type": "subscribe", "streamName": "alerts"}))
    
    # Mock sensor data generation (every 2 seconds)
    # In production, replace with real sensor readings
    async def send():
        while True:
            await ws.send(json.dumps({"type": "insert", "target": "sensor_data", "data": {"id": "sensor1", "temperature": 20 + random.random() * 15}}))
            await asyncio.sleep(2)
    
    # Run data sending in background
    asyncio.create_task(send())
    
    # Step 3: Handle incoming alert messages
    async for msg in ws:
        data = json.loads(msg)
        if data["type"] == "data":
            print(data["data"]) # Print alerts when temp > 25

asyncio.run(main())
```

:::



## Next Steps

- Explore the [JSONJet Reference](/api/) for detailed syntax
- Check out [Statement Documentation](/api/statements/) for all available commands
- Learn about [Operators](/api/operators/) for data processing
- Build real-time applications with the WebSocket API 