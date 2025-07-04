import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { StreamManager } from '../src/core/stream-manager.js';
import { QueryEngine } from '../src/core/query-engine.js';

describe('Summarize Operations', () => {
  let streamManager;
  let queryEngine;
  
  beforeEach(() => {
    // Create fresh instances for each test to avoid conflicts
    streamManager = new StreamManager();
    queryEngine = new QueryEngine(streamManager);
  });

  it('should summarize data without window when flushed', async () => {
    // Create test streams
    streamManager.createStream('sales');
    streamManager.createStream('summary_results');

    // Set up data collection for results
    const results = [];
    const subscriptionId = streamManager.subscribeToStream('summary_results', (message) => {
      results.push(message.data);
    });

    try {
      // Create summarization flow without window
      const flowResult = await queryEngine.executeStatement(
        'create flow test_summary from sales | summarize { total_amount: sum(amount), count: count() } by product | insert_into(summary_results)'
      );
      
      console.log('Flow creation result:', JSON.stringify(flowResult, null, 2));
      
      expect(flowResult.success).toBe(true);
      expect(flowResult.message).toContain('test_summary');

      // Insert test data
      await streamManager.insertIntoStream('sales', { product: 'laptop', amount: 1200 });
      await streamManager.insertIntoStream('sales', { product: 'laptop', amount: 1100 });
      await streamManager.insertIntoStream('sales', { product: 'mouse', amount: 25 });
      await streamManager.insertIntoStream('sales', { product: 'mouse', amount: 30 });

      // Before flush, no results should be emitted (no window, no flush)
      expect(results).toHaveLength(0);

      // Flush the sales stream to trigger summarization output
      await streamManager.flushStream('sales');

      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Now we should have summarized results
      expect(results.length).toBeGreaterThan(0);

      console.log('Query language test results:', JSON.stringify(results, null, 2));

      // Verify the summarized data - now using group_key instead of product
      const laptopSummary = results.find(r => r.group_key === 'laptop');
      const mouseSummary = results.find(r => r.group_key === 'mouse');

      expect(laptopSummary).toBeDefined();
      expect(laptopSummary.total_amount).toBe(2300); // 1200 + 1100
      expect(laptopSummary.count).toBe(2);

      expect(mouseSummary).toBeDefined();
      expect(mouseSummary.total_amount).toBe(55); // 25 + 30
      expect(mouseSummary.count).toBe(2);

      console.log('✅ Summarize without window test passed');

    } finally {
      // Clean up subscription
      streamManager.unsubscribeFromStream(subscriptionId);
    }
  });
});