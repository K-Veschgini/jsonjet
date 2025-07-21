#!/usr/bin/env bun

/**
 * Compact Performance Test for ResonanceDB Server
 * Clean, minimalistic version with proper flow logic
 */

const SERVER_URL = 'http://localhost:3333';
const WS_URL = 'ws://localhost:3333/ws';
const RECORD_COUNT = 100000;
const BATCH_SIZE = 100;

class CompactPerformanceTest {
  constructor() {
    this.ws = null;
    this.resultResolver = null;
    this.timeoutId = null;
    this.insertResponses = 0;
  }

  async connectWS() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen = () => resolve();
      this.ws.onmessage = (e) => this.handleMessage(JSON.parse(e.data));
      this.ws.onerror = reject;
    });
  }

  handleMessage(msg) {
    if (msg.type === 'data' && msg.streamName === 'results' && this.resultResolver) {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      this.resultResolver(msg.data);
      this.resultResolver = null;
    } else if (msg.type === 'data' && msg.streamName === '_log') {
      if (msg.data.level === 'error') {
        console.error('❌ Server error:', msg.data.message);
        process.exit(1);
      }
    } else if (msg.type === 'insert_response' && msg.success) {
      this.insertResponses += msg.count;
    }
  }

  subscribe(stream) {
    this.ws.send(JSON.stringify({ type: 'subscribe', streamName: stream }));
  }

  async query(q) {
    const res = await fetch(`${SERVER_URL}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async insert(target, data) {
    const res = await fetch(`${SERVER_URL}/api/insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, data })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  generateRecords() {
    return Array.from({ length: RECORD_COUNT }, (_, i) => ({
      id: i + 1,
      x: 1,
      timestamp: new Date().toISOString(),
      category: 'A'
    }));
  }

  async waitForResult() {
    return new Promise((resolve) => {
      this.resultResolver = resolve;
      this.timeoutId = setTimeout(() => {
        if (this.resultResolver) {
          this.resultResolver(null);
          this.resultResolver = null;
          this.timeoutId = null;
        }
      }, 10000); // 10 seconds for aggregation
    });
  }

  async setupStreams() {
    await this.query('create stream data');
    await this.query('create stream results');
    await this.query(`create flow sum_aggregation as
      data | summarize { total_sum: sum(x), record_count: count() } | insert_into(results)`);
  }

  async resetTest() {
    await this.query('create or replace stream data');
    await this.query(`create or replace flow sum_aggregation as
      data | summarize { total_sum: sum(x), record_count: count() } | insert_into(results)`);
  }

  async httpSingle(records) {
    for (const record of records) {
      await this.insert('data', record);
    }
  }

  async httpBatch(records) {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      await this.insert('data', records.slice(i, i + BATCH_SIZE));
    }
  }

  async wsSingle(records) {
    this.insertResponses = 0;
    for (const record of records) {
      this.ws.send(JSON.stringify({ type: 'insert', target: 'data', data: record }));
    }
    // Wait for confirmations
    const start = Date.now();
    while (this.insertResponses < RECORD_COUNT && (Date.now() - start) < 5000) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  async wsBatch(records) {
    this.insertResponses = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      this.ws.send(JSON.stringify({ 
        type: 'batch_insert', 
        target: 'data', 
        data: records.slice(i, i + BATCH_SIZE) 
      }));
    }
    // Wait for confirmations
    const start = Date.now();
    while (this.insertResponses < RECORD_COUNT && (Date.now() - start) < 5000) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  async benchmark(name, method, records) {
    console.log(`\n🔍 ${name}`);
    console.log('='.repeat(40));

    // Reset test environment
    await this.resetTest();

    // Send data and measure time
    const start = Date.now();
    await method.call(this, records);
    
    // Setup result listener AFTER data is sent but BEFORE flush
    const resultPromise = this.waitForResult();
    
    // Flush and wait for aggregation result
    await this.query('flush data');
    const result = await resultPromise;
    const duration = Date.now() - start;

    const rate = Math.round(RECORD_COUNT / (duration / 1000));
    const valid = result && result.total_sum === RECORD_COUNT && result.record_count === RECORD_COUNT;

    console.log(`✅ Time: ${duration}ms`);
    console.log(`📈 Rate: ${rate.toLocaleString()} records/sec`);
    console.log(`📊 Valid: ${valid ? 'YES' : 'NO'} (sum=${result?.total_sum}, count=${result?.record_count})`);

    return { name, duration, rate, valid };
  }

  async run() {
    console.log('🚀 Compact Performance Test');
    console.log(`📊 Records: ${RECORD_COUNT.toLocaleString()}, Batch: ${BATCH_SIZE}`);
    console.log('='.repeat(50));

    try {
      await this.connectWS();
      await this.setupStreams();
      this.subscribe('results');
      this.subscribe('_log');

      const records = this.generateRecords();

      const results = [
        await this.benchmark('HTTP Single', this.httpSingle, records),
        await this.benchmark('HTTP Batch', this.httpBatch, records),
        await this.benchmark('WS Single', this.wsSingle, records),
        await this.benchmark('WS Batch', this.wsBatch, records)
      ];

      // Show ranking
      console.log('\n📊 RESULTS');
      console.log('='.repeat(50));
      results.sort((a, b) => b.rate - a.rate);
      results.forEach((r, i) => {
        const medal = ['🥇', '🥈', '🥉', '  '][i] || '  ';
        const status = r.valid ? '✅' : '❌';
        console.log(`${medal} ${r.name}: ${r.rate.toLocaleString()} rec/sec ${status}`);
      });

      const fastest = results[0];
      const slowest = results[results.length - 1];
      const improvement = ((fastest.rate - slowest.rate) / slowest.rate * 100).toFixed(1);
      console.log(`\n🚀 Fastest is ${improvement}% faster than slowest`);

      // Clean up any pending timeouts
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      
      this.ws.close();
      console.log('\n🎉 Test completed!');
      
      // Force exit to avoid hanging
      setTimeout(() => process.exit(0), 100);

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }
}

// Wait for server
async function waitForServer() {
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`${SERVER_URL}/api/status`);
      if (res.ok) return;
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Server not ready');
}

async function main() {
  try {
    await waitForServer();
    const test = new CompactPerformanceTest();
    await test.run();
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { CompactPerformanceTest };