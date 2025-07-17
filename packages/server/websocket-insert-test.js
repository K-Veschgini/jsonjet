import WebSocket from 'ws';

const SERVER_URL = 'http://localhost:3333';
const WS_URL = 'ws://localhost:3333/ws';

class WebSocketInsertTest {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.responsesReceived = 0;
    this.subscriptionData = [];
  }

  async setupServer() {
    console.log('🚀 Starting server setup...');
    
    // Create stream and flow via HTTP
    const createStreamResponse = await fetch(`${SERVER_URL}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'create stream ws_test_stream' })
    });
    
    if (!createStreamResponse.ok) {
      console.log('Stream might already exist, continuing...');
    }

    const createFlowResponse = await fetch(`${SERVER_URL}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: `create or replace flow ws_aggregation as
scan(ws_test_stream)
| summarize { total_sum: sum(x), count: count() }
| insert_into(ws_summary_stream)` 
      })
    });

    if (!createFlowResponse.ok) {
      const error = await createFlowResponse.text();
      throw new Error(`Failed to create flow: ${error}`);
    }

    console.log('✅ Server setup completed');
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        console.log('🔌 WebSocket connected');
        this.connected = true;
        resolve();
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      });
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
      
      this.ws.on('close', () => {
        console.log('🔌 WebSocket disconnected');
        this.connected = false;
      });
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case 'connected':
        console.log(`📡 ${message.message} (Client ID: ${message.clientId})`);
        break;
      
      case 'insert_response':
        this.responsesReceived++;
        if (message.success) {
          console.log(`✅ Insert successful: ${message.count} records into '${message.target}'`);
        } else {
          console.error(`❌ Insert failed: ${message.error}`);
        }
        break;
      
      case 'subscribed':
        console.log(`📊 Subscribed to stream '${message.streamName}' (ID: ${message.subscriptionId})`);
        break;
      
      case 'data':
        this.subscriptionData.push(message.data);
        console.log(`📈 Received data from '${message.streamName}':`, message.data);
        break;
      
      case 'error':
        console.error('❌ WebSocket error:', message.message);
        break;
      
      default:
        console.log('📦 Received message:', message);
    }
  }

  async subscribeToSummary() {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify({
      type: 'subscribe',
      streamName: 'ws_summary_stream'
    }));
  }

  async insertSingleRecord(target, data) {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify({
      type: 'insert',
      target,
      data
    }));
  }

  async insertBatchRecords(target, records) {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify({
      type: 'batch_insert',
      target,
      data: records
    }));
  }

  async runTest() {
    try {
      const startTime = Date.now();
      
      // Setup
      await this.setupServer();
      await this.connectWebSocket();
      
      // Wait a moment for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Subscribe to summary stream to see aggregation results
      await this.subscribeToSummary();
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('\n🧪 Testing WebSocket Insert Functionality');
      console.log('=' .repeat(50));

      // Test 1: Single inserts
      console.log('\n📝 Test 1: Single Record Inserts');
      for (let i = 1; i <= 5; i++) {
        await this.insertSingleRecord('ws_test_stream', { x: i * 10 });
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
      }

      // Test 2: Batch insert
      console.log('\n📦 Test 2: Batch Insert');
      const batchRecords = Array.from({ length: 10 }, (_, i) => ({ 
        x: (i + 6) * 10 
      }));
      await this.insertBatchRecords('ws_test_stream', batchRecords);

      // Test 3: Large batch insert
      console.log('\n🚀 Test 3: Large Batch Insert');
      const largeBatch = Array.from({ length: 100 }, () => ({ 
        x: Math.floor(Math.random() * 1000) 
      }));
      await this.insertBatchRecords('ws_test_stream', largeBatch);

      // Wait for all responses and aggregation results
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log('\n📊 Test Results:');
      console.log('=' .repeat(30));
      console.log(`⏱️  Total duration: ${duration}ms`);
      console.log(`📬 Insert responses received: ${this.responsesReceived}`);
      console.log(`📈 Aggregation results received: ${this.subscriptionData.length}`);
      
      if (this.subscriptionData.length > 0) {
        const lastResult = this.subscriptionData[this.subscriptionData.length - 1];
        console.log(`🎯 Final aggregation:`, lastResult);
      }

      // Close connection
      this.ws.close();
      
      console.log('\n✅ WebSocket insert test completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      if (this.ws) {
        this.ws.close();
      }
      process.exit(1);
    }
  }
}

// Run the test
const test = new WebSocketInsertTest();
test.runTest(); 