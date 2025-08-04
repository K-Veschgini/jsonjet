# Quick Start

Get started with JSONJet server using WebSockets for real-time stream processing.

JSONJet provides two APIs:
- **HTTP API** for setup operations (creating streams, flows, lookups)
- **WebSocket API** for real-time operations (data insertion, subscriptions)

## Install and Start JSONJet Server

- Download the latest JSONJet release for your system from the [Downloads page](/downloads.html)

## Dependencies

::: code-group

```bash [JavaScript]
# No additional dependencies required
# Uses built-in WebSocket and fetch APIs
```

```bash [Python]
pip install websockets aiohttp
```

```bash [Go]
go get github.com/gorilla/websocket
```

```toml [Rust]
# Add to Cargo.toml
[dependencies]
tokio-tungstenite = "0.27"
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1.0", features = ["full"] }
serde_json = "1.0"
futures-util = "0.3"
chrono = { version = "0.4", features = ["serde"] }
```

:::

## Running the Examples

Each example can be saved to a file and run independently. All examples require the JSONJet server to be running first.

::: code-group

```bash [JavaScript]
# Save the JavaScript code to sensor-demo.js
# Install dependencies (optional - uses built-in WebSocket)
npm install ws

# Run the demo
node sensor-demo.js
```

```bash [Python]
# Save the Python code to sensor-demo.py
# Install dependencies
pip install websockets aiohttp

# Run the demo
python sensor-demo.py
```

```bash [Go]
# Save the Go code to sensor-demo.go
# Create go.mod file:
# module sensor-demo
# go 1.19
# require github.com/gorilla/websocket v1.5.0

# Install dependencies
go mod tidy

# Run the demo
go run sensor-demo.go
```

```bash [Rust]
# Save the Rust code to sensor-demo.rs
# Create Cargo.toml with dependencies (see Dependencies section above)

# Run the demo
cargo run --bin sensor-demo
```

:::

**Expected Behavior:**

The demo sends 3 sensor readings with 1-second delays:
1. `sensor_1: 65°C` (filtered out - below 70°C threshold)
2. `sensor_2: 85°C` (generates warning alert)
3. `sensor_3: 112°C` (generates danger alert)

After sending all data, the flow processes and generates 2 alerts. The demo automatically exits after receiving these 2 alerts or after a 10-second timeout.

**Expected Output:**
```
Alert: temperature too high - Sensor sensor_2: 85°C (warning)
Alert: temperature too high - Sensor sensor_3: 112°C (danger)
```

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


## Complete Example: Sensor Monitoring System

This example demonstrates a complete JSONJet application that:

1. **Creates infrastructure** - Sets up streams and a processing flow
2. **Connects to WebSocket** - Establishes real-time communication
3. **Subscribes to alerts** - Listens for filtered data
4. **Sends mock sensor data** - Simulates temperature readings
5. **Processes data in real-time** - Filters temperatures above 70°C and generates tiered alerts

The flow filters sensor data and generates alerts when temperature exceeds 70°C, with different severity levels (warning vs danger), showing how JSONJet can process streaming data with conditional logic in real-time.

**Demo Flow:**
- Sends 3 temperature readings with 1-second intervals
- Only readings above 70°C trigger alerts (2 out of 3)
- Automatically exits after receiving the expected 2 alerts



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
    query: `create flow data_processor as
  sensor_data 
  | where temperature > 70 
  | select { 
      sensor_id: sensor_id,
      message: "temperature too high", 
      temperature: temperature, 
      timestamp: timestamp,
      level: iff(temperature>=100, 'danger', 'warning') 
    } 
  | insert_into(alerts)` 
  })
});

// Step 2: Connect to WebSocket for real-time operations
let alertCount = 0;
const ws = new WebSocket('ws://localhost:3333/ws');

// Timeout after 10 seconds if no alerts received
setTimeout(() => process.exit(0), 10000);

ws.onopen = () => {
  // Subscribe to alerts stream to receive filtered data
  ws.send(JSON.stringify({ type: 'subscribe', streamName: 'alerts' }));
  
  // Send test sensor readings with different temperature levels
  const testData = [
    { sensor_id: "sensor_1", temperature: 65, timestamp: new Date().toISOString() },
    { sensor_id: "sensor_2", temperature: 85, timestamp: new Date().toISOString() },
    { sensor_id: "sensor_3", temperature: 112, timestamp: new Date().toISOString() }
  ];
  
  testData.forEach((reading, i) => {
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'insert',
        target: 'sensor_data',
        data: reading
      }));
    }, i * 1000); // Send each reading 1 second apart
  });
  
  // Process all pending data through the flow
  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'execute', query: 'flush sensor_data' }));
  }, 4000);
};

// Step 3: Handle incoming alert messages
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.type === 'data') {
    console.log(`Alert: ${m.data.message} - Sensor ${m.data.sensor_id}: ${m.data.temperature}°C (${m.data.level})`);
    if (++alertCount >= 2) process.exit(0); // Exit after 2 alerts
  }
};
```

```python [Python]
import asyncio, websockets, json, aiohttp
from datetime import datetime

async def setup():
    # Step 1: Create infrastructure via HTTP API
    async with aiohttp.ClientSession() as s:
        # Create input stream for sensor data
        await s.post('http://localhost:3333/api/execute', json={'query': 'create stream sensor_data'})
        # Create output stream for alerts
        await s.post('http://localhost:3333/api/execute', json={'query': 'create stream alerts'})
        # Create processing flow that filters and transforms data
        await s.post('http://localhost:3333/api/execute', json={
            'query': '''create flow data_processor as
  sensor_data 
  | where temperature > 70 
  | select { 
      sensor_id: sensor_id,
      message: "temperature too high", 
      temperature: temperature, 
      timestamp: timestamp,
      level: iff(temperature>=100, 'danger', 'warning') 
    } 
  | insert_into(alerts)'''
        })

async def main():
    await setup()
    
    # Step 2: Connect to WebSocket for real-time operations
    ws = await websockets.connect('ws://localhost:3333/ws')
    # Subscribe to alerts stream to receive filtered data
    await ws.send(json.dumps({"type": "subscribe", "streamName": "alerts"}))
    
    # Send test sensor readings with different temperature levels
    test_data = [
        {"sensor_id": "sensor_1", "temperature": 65, "timestamp": datetime.now().isoformat() + "Z"},
        {"sensor_id": "sensor_2", "temperature": 85, "timestamp": datetime.now().isoformat() + "Z"},
        {"sensor_id": "sensor_3", "temperature": 112, "timestamp": datetime.now().isoformat() + "Z"}
    ]
    
    for i, reading in enumerate(test_data):
        await asyncio.sleep(1)  # Send each reading 1 second apart
        await ws.send(json.dumps({
            "type": "insert",
            "target": "sensor_data",
            "data": reading
        }))
    
    # Process all pending data through the flow
    await asyncio.sleep(1)
    await ws.send(json.dumps({"type": "execute", "query": "flush sensor_data"}))
    
    # Step 3: Handle incoming alert messages
    alert_count = 0
    try:
        async with asyncio.timeout(10):  # 10 second timeout
            async for msg in ws:
                data = json.loads(msg)
                if data["type"] == "data":
                    alert = data["data"]
                    print(f"Alert: {alert['message']} - Sensor {alert['sensor_id']}: {alert['temperature']}°C ({alert['level']})")
                    alert_count += 1
                    if alert_count >= 2:  # Exit after 2 alerts
                        break
    except asyncio.TimeoutError:
        pass

asyncio.run(main())
```

```go [Go]
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/gorilla/websocket"
)

func main() {
	// Step 1: Create infrastructure via HTTP API
	setupInfrastructure()
	
	// Step 2: Connect to WebSocket for real-time operations
	u := url.URL{Scheme: "ws", Host: "localhost:3333", Path: "/ws"}
	c, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		log.Fatal("dial:", err)
	}
	defer c.Close()

	// Subscribe to alerts stream to receive filtered data
	subscribeMsg := map[string]interface{}{
		"type":       "subscribe",
		"streamName": "alerts",
	}
	if err := c.WriteJSON(subscribeMsg); err != nil {
		log.Println("subscribe error:", err)
		return
	}

	// Send test sensor readings with different temperature levels
	testData := []map[string]interface{}{
		{"sensor_id": "sensor_1", "temperature": 65, "timestamp": time.Now().Format(time.RFC3339)},
		{"sensor_id": "sensor_2", "temperature": 85, "timestamp": time.Now().Format(time.RFC3339)},
		{"sensor_id": "sensor_3", "temperature": 112, "timestamp": time.Now().Format(time.RFC3339)},
	}

	// Send readings 1 second apart
	go func() {
		for i, reading := range testData {
			time.Sleep(time.Duration(i) * time.Second)
			insertMsg := map[string]interface{}{
				"type":   "insert",
				"target": "sensor_data",
				"data":   reading,
			}
			if err := c.WriteJSON(insertMsg); err != nil {
				log.Println("insert error:", err)
				return
			}
		}

		// Process all pending data through the flow
		time.Sleep(1 * time.Second)
		flushMsg := map[string]interface{}{
			"type":  "execute",
			"query": "flush sensor_data",
		}
		if err := c.WriteJSON(flushMsg); err != nil {
			log.Println("flush error:", err)
		}
	}()

	// Step 3: Handle incoming alert messages with timeout
	alertCount := 0
	timeout := time.After(10 * time.Second)
	
	for {
		select {
		case <-timeout:
			return
		default:
			c.SetReadDeadline(time.Now().Add(100 * time.Millisecond))
			var msg map[string]interface{}
			err := c.ReadJSON(&msg)
			if err != nil {
				continue
			}

			if msg["type"] == "data" {
				if data, ok := msg["data"].(map[string]interface{}); ok {
					fmt.Printf("Alert: %s - Sensor %s: %.0f°C (%s)\n",
						data["message"], data["sensor_id"], data["temperature"], data["level"])
					alertCount++
					if alertCount >= 2 { // Exit after 2 alerts
						return
					}
				}
			}
		}
	}
}

func setupInfrastructure() {
	// Create streams and flow via HTTP API
	queries := []string{
		"create stream sensor_data",
		"create stream alerts",
		`create flow data_processor as
  sensor_data 
  | where temperature > 70 
  | select { 
      sensor_id: sensor_id,
      message: "temperature too high", 
      temperature: temperature, 
      timestamp: timestamp,
      level: iff(temperature>=100, 'danger', 'warning') 
    } 
  | insert_into(alerts)`,
	}

	for _, query := range queries {
		payload := map[string]string{"query": query}
		jsonData, _ := json.Marshal(payload)
		
		resp, err := http.Post("http://localhost:3333/api/execute",
			"application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Error executing query '%s': %v", query, err)
			continue
		}
		resp.Body.Close()
	}
}
```

```rust [Rust]
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use tokio::time::sleep;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{SinkExt, StreamExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Step 1: Create infrastructure via HTTP API
    setup_infrastructure().await?;
    
    // Step 2: Connect to WebSocket for real-time operations
    let url = "ws://localhost:3333/ws";
    let (ws_stream, _) = connect_async(url).await?;
    let (mut write, mut read) = ws_stream.split();

    // Subscribe to alerts stream to receive filtered data
    let subscribe_msg = json!({
        "type": "subscribe",
        "streamName": "alerts"
    });
    write.send(Message::Text(subscribe_msg.to_string().into())).await?;

    // Send test sensor readings with different temperature levels
    let test_data = vec![
        json!({"sensor_id": "sensor_1", "temperature": 65, "timestamp": chrono::Utc::now().to_rfc3339()}),
        json!({"sensor_id": "sensor_2", "temperature": 85, "timestamp": chrono::Utc::now().to_rfc3339()}),
        json!({"sensor_id": "sensor_3", "temperature": 112, "timestamp": chrono::Utc::now().to_rfc3339()}),
    ];

    // Send readings sequentially with delays
    for (i, reading) in test_data.iter().enumerate() {
        if i > 0 {
            sleep(Duration::from_secs(1)).await;
        }
        let insert_msg = json!({
            "type": "insert",
            "target": "sensor_data",
            "data": reading
        });
        write.send(Message::Text(insert_msg.to_string().into())).await?;
    }

    // Process all pending data through the flow
    sleep(Duration::from_secs(1)).await;
    let flush_msg = json!({
        "type": "execute",
        "query": "flush sensor_data"
    });
    write.send(Message::Text(flush_msg.to_string().into())).await?;

    // Step 3: Handle incoming alert messages
    let mut alert_count = 0;
    let timeout = tokio::time::timeout(Duration::from_secs(10), async {
        while let Some(msg) = read.next().await {
            match msg? {
                Message::Text(text) => {
                    if let Ok(data) = serde_json::from_str::<Value>(&text) {
                        if data["type"] == "data" {
                            if let Some(alert) = data["data"].as_object() {
                                println!(
                                    "Alert: {} - Sensor {}: {}°C ({})",
                                    alert["message"].as_str().unwrap_or(""),
                                    alert["sensor_id"].as_str().unwrap_or(""),
                                    alert["temperature"].as_f64().unwrap_or(0.0) as i32,
                                    alert["level"].as_str().unwrap_or("")
                                );
                                alert_count += 1;
                                if alert_count >= 2 { // Exit after 2 alerts
                                    break;
                                }
                            }
                        }
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
        Ok::<(), Box<dyn std::error::Error>>(())
    });
    
    let _ = timeout.await;

    Ok(())
}

async fn setup_infrastructure() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let queries = vec![
        "create stream sensor_data",
        "create stream alerts",
        r#"create flow data_processor as
  sensor_data 
  | where temperature > 70 
  | select { 
      sensor_id: sensor_id,
      message: "temperature too high", 
      temperature: temperature, 
      timestamp: timestamp,
      level: iff(temperature>=100, 'danger', 'warning') 
    } 
  | insert_into(alerts)"#,
    ];

    for query in queries {
        let payload = json!({"query": query});
        let response = client
            .post("http://localhost:3333/api/execute")
            .json(&payload)
            .send()
            .await;
        
        if let Err(e) = response {
            eprintln!("Error executing query '{}': {}", query, e);
        }
    }

    Ok(())
}
```
:::
 