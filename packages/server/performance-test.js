#!/usr/bin/env bun

/**
 * Performance Test for ResonanceDB Server
 * Tests high-volume data insertion and aggregation query performance
 * Benchmarks 4 different insertion methods:
 * 1. HTTP single inserts
 * 2. HTTP batch inserts  
 * 3. WebSocket single inserts
 * 4. WebSocket batch inserts
 */

const SERVER_URL = 'http://localhost:3333';
const WS_URL = 'ws://localhost:3333/ws';
const RECORD_COUNT = 10000; // Reduced for faster testing
const BATCH_SIZE = 100;

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
    this.benchmarkResults = {
      httpSingle: { time: 0, rate: 0 },
      httpBatch: { time: 0, rate: 0 },
      wsSingle: { time: 0, rate: 0 },
      wsBatch: { time: 0, rate: 0 }
    };
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
   * Generate all test records
   */
  generateAllRecords() {
    const records = [];
    for (let i = 0; i < RECORD_COUNT; i++) {
      records.push(this.generateTestRecord(i + 1));
    }
    return records;
  }

  /**
   * Benchmark 1: HTTP Single Inserts
   */
  async benchmarkHttpSingle(records) {
    console.log('\n🔍 Benchmark 1: HTTP Single Inserts');
    console.log('=' .repeat(50));
    
    const startTime = Date.now();
    
    // Process records sequentially
    for (const record of records) {
      await this.executeQuery(`insert into data ${JSON.stringify(record)}`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const rate = Math.round(RECORD_COUNT / (duration / 1000));
    
    this.benchmarkResults.httpSingle = { time: duration, rate };
    
    console.log(`✅ HTTP Single Inserts completed`);
    console.log(`⏱️  Time: ${duration}ms`);
    console.log(`📈 Rate: ${rate} records/second`);
  }

  /**
   * Benchmark 2: HTTP Batch Inserts
   */
  async benchmarkHttpBatch(records) {
    console.log('\n🔍 Benchmark 2: HTTP Batch Inserts');
    console.log('=' .repeat(50));
    
    const startTime = Date.now();
    
    // Process records in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchJson = JSON.stringify(batch);
      await this.executeQuery(`insert into data ${batchJson}`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const rate = Math.round(RECORD_COUNT / (duration / 1000));
    
    this.benchmarkResults.httpBatch = { time: duration, rate };
    
    console.log(`✅ HTTP Batch Inserts completed`);
    console.log(`⏱️  Time: ${duration}ms`);
    console.log(`📈 Rate: ${rate} records/second`);
  }

  /**
   * Benchmark 3: WebSocket Single Inserts
   */
  async benchmarkWebSocketSingle(records) {
    console.log('\n🔍 Benchmark 3: WebSocket Single Inserts');
    console.log('=' .repeat(50));
    
    const startTime = Date.now();
    this.insertResponses = 0;
    this.insertErrors = 0;
    
    // Insert records one by one via WebSocket
    for (const record of records) {
      this.ws.send(JSON.stringify({
        type: 'insert',
        target: 'data',
        data: record
      }));
    }
    
    // Wait for all insert responses
    const maxWaitTime = 30000; // 30 seconds max
    const startWait = Date.now();
    while (this.insertResponses < RECORD_COUNT && (Date.now() - startWait) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const rate = Math.round(RECORD_COUNT / (duration / 1000));
    
    this.benchmarkResults.wsSingle = { time: duration, rate };
    
    console.log(`✅ WebSocket Single Inserts completed`);
    console.log(`⏱️  Time: ${duration}ms`);
    console.log(`📈 Rate: ${rate} records/second`);
    console.log(`📊 Insert responses: ${this.insertResponses}/${RECORD_COUNT}`);
    if (this.insertErrors > 0) {
      console.log(`❌ Insert errors: ${this.insertErrors}`);
    }
  }

  /**
   * Benchmark 4: WebSocket Batch Inserts
   */
  async benchmarkWebSocketBatch(records) {
    console.log('\n🔍 Benchmark 4: WebSocket Batch Inserts');
    console.log('=' .repeat(50));
    
    const startTime = Date.now();
    this.insertResponses = 0;
    this.insertErrors = 0;
    
    // Insert records in batches via WebSocket
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      this.ws.send(JSON.stringify({
        type: 'batch_insert',
        target: 'data',
        data: batch
      }));
    }
    
    // Wait for all insert responses
    const maxWaitTime = 30000; // 30 seconds max
    const startWait = Date.now();
    while (this.insertResponses < RECORD_COUNT && (Date.now() - startWait) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const rate = Math.round(RECORD_COUNT / (duration / 1000));
    
    this.benchmarkResults.wsBatch = { time: duration, rate };
    
    console.log(`✅ WebSocket Batch Inserts completed`);
    console.log(`⏱️  Time: ${duration}ms`);
    console.log(`📈 Rate: ${rate} records/second`);
    console.log(`📊 Insert responses: ${this.insertResponses}/${RECORD_COUNT}`);
    if (this.insertErrors > 0) {
      console.log(`❌ Insert errors: ${this.insertErrors}`);
    }
  }

  /**
   * Display benchmark results comparison
   */
  displayBenchmarkResults() {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 BENCHMARK RESULTS COMPARISON');
    console.log('=' .repeat(80));
    
    const results = [
      { name: 'HTTP Single Inserts', ...this.benchmarkResults.httpSingle },
      { name: 'HTTP Batch Inserts', ...this.benchmarkResults.httpBatch },
      { name: 'WebSocket Single Inserts', ...this.benchmarkResults.wsSingle },
      { name: 'WebSocket Batch Inserts', ...this.benchmarkResults.wsBatch }
    ];
    
    // Sort by rate (highest first)
    results.sort((a, b) => b.rate - a.rate);
    
    console.log('🏆 Performance Ranking (by records/second):');
    console.log('');
    
    results.forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} ${result.name}`);
      console.log(`   ⏱️  Time: ${result.time}ms`);
      console.log(`   📈 Rate: ${result.rate} records/second`);
      console.log('');
    });
    
    // Calculate improvements
    const fastest = results[0];
    const slowest = results[results.length - 1];
    const improvement = ((fastest.rate - slowest.rate) / slowest.rate * 100).toFixed(1);
    
    console.log(`🚀 Fastest method (${fastest.name}) is ${improvement}% faster than slowest (${slowest.name})`);
    console.log('=' .repeat(80));
  }

  /**
   * Run the complete performance test
   */
  async run() {
    console.log('�� Starting ResonanceDB Performance Test');
    console.log(`📊 Records to insert: ${RECORD_COUNT.toLocaleString()}`);
    console.log(`📦 Batch size: ${BATCH_SIZE}`);
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
      
      // Step 5: Generate test data
      console.log('📋 Generating test data...');
      const allRecords = this.generateAllRecords();
      
      // Step 6: Run all benchmarks
      console.log('\n🔬 Running insertion benchmarks...');
      
      // Clear data before each benchmark
      await this.executeQuery('delete from data');
      
      // Benchmark 1: HTTP Single
      await this.benchmarkHttpSingle(allRecords);
      
      // Clear data
      await this.executeQuery('delete from data');
      
      // Benchmark 2: HTTP Batch
      await this.benchmarkHttpBatch(allRecords);
      
      // Clear data
      await this.executeQuery('delete from data');
      
      // Benchmark 3: WebSocket Single
      await this.benchmarkWebSocketSingle(allRecords);
      
      // Clear data
      await this.executeQuery('delete from data');
      
      // Benchmark 4: WebSocket Batch
      await this.benchmarkWebSocketBatch(allRecords);
      
      // Step 7: Display results
      this.displayBenchmarkResults();
      
      // Step 8: Run final aggregation test with fastest method
      console.log('\n🎯 Running final aggregation test with fastest method...');
      await this.executeQuery('delete from data');
      
      // Use the fastest method for final test
      const fastestMethod = Object.entries(this.benchmarkResults)
        .sort(([,a], [,b]) => b.rate - a.rate)[0][0];
      
      console.log(`🏆 Using fastest method: ${fastestMethod}`);
      
      if (fastestMethod === 'httpSingle') {
        await this.benchmarkHttpSingle(allRecords);
      } else if (fastestMethod === 'httpBatch') {
        await this.benchmarkHttpBatch(allRecords);
      } else if (fastestMethod === 'wsSingle') {
        await this.benchmarkWebSocketSingle(allRecords);
      } else if (fastestMethod === 'wsBatch') {
        await this.benchmarkWebSocketBatch(allRecords);
      }
      
      // Flush and wait for aggregation result
      console.log('🔄 Flushing data stream to complete aggregation...');
      await this.executeQuery('flush data');
      
      this.insertCompleted = true;
      
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