import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createInstances } from '../src/instances.js';

describe('Summarize Operations', () => {
  let streamManager;
  let queryEngine;
  
  beforeEach(() => {
    // Create fresh instances for each test to avoid conflicts
    const instances = createInstances();
    streamManager = instances.streamManager;
    queryEngine = instances.queryEngine;
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
        'create flow test_summary as\nsales | summarize { total_amount: sum(amount), count: count() } by product | insert_into(summary_results)'
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

      // Verify the summarized data (sorted by total for consistency)
      results.sort((a, b) => a.total_amount - b.total_amount);

      expect(results).toHaveLength(2);
      expect(results[0].total_amount).toBe(55); // mouse: 25 + 30
      expect(results[0].count).toBe(2);

      expect(results[1].total_amount).toBe(2300); // laptop: 1200 + 1100
      expect(results[1].count).toBe(2);

      console.log('✅ Summarize without window test passed');

    } finally {
      // Clean up subscription
      streamManager.unsubscribeFromStream(subscriptionId);
    }
  });
});