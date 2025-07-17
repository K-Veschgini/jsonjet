#!/usr/bin/env bun

/**
 * Performance Test for ResonanceDB Server
 * Tests high-volume data insertion and aggregation query performance
 */

  const SERVER_URL = 'http://localhost:3333';
  const WS_URL = 'ws://localhost:3333/ws';
  const RECORD_COUNT = 100000;
  const USE_WEBSOCKET_INSERTS = true; // Toggle between WebSocket and HTTP inserts

class PerformanceTest {
  constructor() {
    this.ws = null;
    this.results = [];
    this.startTime = null;
    this.insertStartTime = null;
    this.queryStartTime = null;
    this.insertCompleted = false;
    this.insertResponses = 0;
    this.insertErrors = 0;
  }

  /**
   * Execute HTTP request to server
   */
  async executeQuery(query) {
    const response = await fetch(`${SERVER_URL}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return await response.json();
  }

  /**
   * Connect to WebSocket for real-time results
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      
      this.ws.onopen = () => {
        console.log('📡 Connected to WebSocket');
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onclose = () => {
        console.log('📡 WebSocket disconnected');
      };
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleWebSocketMessage(message) {
    if (message.type === 'data' && message.streamName === 'results') {
      this.results.push(message.data);
      
      // Only show the final result after we've finished inserting all data
      if (this.insertCompleted) {
        console.log('📊 Final aggregation result:', message.data);
        
        // Calculate total time
        const totalTime = Date.now() - this.startTime;
        console.log(`⏱️  Total execution time: ${totalTime}ms`);
        console.log(`📈 Overall performance: ${(RECORD_COUNT / (totalTime / 1000)).toFixed(0)} records/second`);
        
        // Close connection
        this.ws.close();
      } else {
        console.log('📊 Intermediate result (record_count: ' + message.data.record_count + ')');
      }
    } else if (message.type === 'insert_response') {
      if (message.success) {
        this.insertResponses += message.count;
      } else {
        this.insertErrors++;
        console.error('❌ Insert error:', message.error);
      }
    } else if (message.type === 'subscribed') {
      console.log('✅ Subscribed to results stream');
    }
  }

  /**
   * Subscribe to results stream
   */
  subscribeToResults() {
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      streamName: 'results'
    }));
  }

  /**
   * Generate random test data
   */
  generateTestRecord(id) {
    return {
      id,
      x: Math.floor(Math.random() * 1000) + 1, // Random number 1-1000
      timestamp: new Date().toISOString(),
      category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)]
    };
  }

     /**
    * Insert data in batches for better performance (HTTP)
    */
   async insertDataBatch(records) {
     // Process records sequentially to avoid overwhelming the server
     for (const record of records) {
       await this.executeQuery(`insert into data ${JSON.stringify(record)}`);
     }
   }

   /**
    * Insert single record via WebSocket
    */
   insertRecordWS(target, data) {
     this.ws.send(JSON.stringify({
       type: 'insert',
       target,
       data
     }));
   }

   /**
    * Insert batch of records via WebSocket
    */
   insertBatchWS(target, records) {
     this.ws.send(JSON.stringify({
       type: 'batch_insert',
       target,
       data: records
     }));
   }

   /**
    * Insert data using WebSocket for better performance
    */
   async insertDataWebSocket(records) {
     const batchSize = 100; // Insert in batches of 100
     
     for (let i = 0; i < records.length; i += batchSize) {
       const batch = records.slice(i, i + batchSize);
       this.insertBatchWS('data', batch);
       
       // Small delay to prevent overwhelming the server
       if (i + batchSize < records.length) {
         await new Promise(resolve => setTimeout(resolve, 5));
       }
     }
   }

  /**
   * Run the complete performance test
   */
  async run() {
    console.log('🚀 Starting ResonanceDB Performance Test');
    console.log(`📊 Records to insert: ${RECORD_COUNT.toLocaleString()}`);
    console.log('=' .repeat(60));
    
    this.startTime = Date.now();
    
    try {
      // Step 1: Connect to WebSocket
      await this.connectWebSocket();
      
      // Step 2: Create streams
      console.log('📝 Creating streams...');
      await this.executeQuery('create stream data');
      await this.executeQuery('create stream results');
      
      // Step 3: Subscribe to results stream
      this.subscribeToResults();
      
      // Step 4: Create flow for aggregation
      console.log('⚡ Creating aggregation flow...');
      this.queryStartTime = Date.now();
      
      const flowResult = await this.executeQuery(`create or replace flow sum_aggregation as
data | summarize { total_sum: sum(x), record_count: count() } | insert_into(results)`);
      
      console.log('✅ Flow creation result:', flowResult);
      
      // Step 5: Insert test data
      console.log(`📥 Inserting ${RECORD_COUNT.toLocaleString()} records...`);
      console.log(`🔧 Using ${USE_WEBSOCKET_INSERTS ? 'WebSocket' : 'HTTP'} inserts`);
      this.insertStartTime = Date.now();
      
      if (USE_WEBSOCKET_INSERTS) {
        // Generate all records first
        const allRecords = [];
        for (let i = 0; i < RECORD_COUNT; i++) {
          allRecords.push(this.generateTestRecord(i + 1));
        }
        
        // Insert via WebSocket
        await this.insertDataWebSocket(allRecords);
        
        // Wait for all insert responses
        const maxWaitTime = 30000; // 30 seconds max
        const startWait = Date.now();
        while (this.insertResponses < RECORD_COUNT && (Date.now() - startWait) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`📊 Insert responses received: ${this.insertResponses}/${RECORD_COUNT}`);
        if (this.insertErrors > 0) {
          console.log(`❌ Insert errors: ${this.insertErrors}`);
        }
      } else {
        // Use HTTP inserts (original method)
        const BATCH_SIZE = 10; // Much smaller batches to avoid overwhelming server
        let insertedCount = 0;
        
        for (let i = 0; i < RECORD_COUNT; i += BATCH_SIZE) {
          const batchSize = Math.min(BATCH_SIZE, RECORD_COUNT - i);
          const batch = [];
          
          for (let j = 0; j < batchSize; j++) {
            batch.push(this.generateTestRecord(i + j + 1));
          }
          
          await this.insertDataBatch(batch);
          insertedCount += batchSize;
          
          // Add small delay every 1000 records to prevent overwhelming the server
          if (insertedCount % 1000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
          // Progress reporting
          if (insertedCount % 10000 === 0) {
            const elapsed = Date.now() - this.insertStartTime;
            const rate = Math.round(insertedCount / (elapsed / 1000));
            console.log(`📈 Inserted ${insertedCount.toLocaleString()}/${RECORD_COUNT.toLocaleString()} records (${rate} records/sec)`);
          }
        }
      }
      
      const insertTime = Date.now() - this.insertStartTime;
      console.log(`✅ Data insertion completed in ${insertTime}ms`);
      console.log(`📊 Insert rate: ${Math.round(RECORD_COUNT / (insertTime / 1000))} records/second`);
      
      // Mark insertion as completed
      this.insertCompleted = true;
      
      // Step 6: Flush the stream to trigger final aggregation
      console.log('🔄 Flushing data stream to complete aggregation...');
      await this.executeQuery('flush data');
      
      console.log('⏳ Waiting for aggregation result...');
      
      // Wait for WebSocket result (handled in handleWebSocketMessage)
      return new Promise((resolve) => {
        const originalClose = this.ws.onclose;
        this.ws.onclose = () => {
          originalClose();
          resolve();
        };
      });
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }
}

/**
 * Wait for server to be ready
 */
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${SERVER_URL}/api/status`);
      if (response.ok) {
        console.log('✅ Server is ready');
        return;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    console.log(`⏳ Waiting for server... (${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Server did not become ready in time');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Wait for server to be available
    await waitForServer();
    
    // Run performance test
    const test = new PerformanceTest();
    await test.run();
    
    console.log('\n🎉 Performance test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Performance test failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main();
}

export { PerformanceTest }; 