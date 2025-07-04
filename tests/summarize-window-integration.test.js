import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { streamManager } from '../src/core/stream-manager.js';
import { queryEngine } from '../src/core/query-engine.js';

describe('Summarize Window Integration', () => {
  beforeEach(() => {
    // Clean up before each test
    streamManager.deleteAllStreams();
  });

  it('should emit results when tumbling window fills up', async () => {
    // Create test streams
    streamManager.createStream('sales');
    streamManager.createStream('summary_results');

    // Set up data collection for results
    const results = [];
    const subscriptionId = streamManager.subscribeToStream('summary_results', (message) => {
      results.push(message.data);
    });

    try {
      // Create summarization flow with 2-item window
      const flowResult = await queryEngine.executeStatement(
        'create flow test_summary from sales | summarize { total_amount: sum(amount), count: count() } by product over window = tumbling_window(2) | insert_into(summary_results)'
      );
      
      expect(flowResult.success).toBe(true);
      expect(flowResult.message).toContain('test_summary');

      // Insert test data gradually
      await streamManager.insertIntoStream('sales', { product: 'laptop', amount: 1200 });
      await streamManager.insertIntoStream('sales', { product: 'mouse', amount: 25 });
      
      // Wait for window to trigger
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have results after window fills
      expect(results.length).toBeGreaterThan(0);
      
      // Verify the structure of results
      const laptopResult = results.find(r => r.group_key === 'laptop');
      const mouseResult = results.find(r => r.group_key === 'mouse');
      
      expect(laptopResult).toBeDefined();
      expect(laptopResult.total_amount).toBe(1200);
      expect(laptopResult.count).toBe(1);
      
      expect(mouseResult).toBeDefined();
      expect(mouseResult.total_amount).toBe(25);
      expect(mouseResult.count).toBe(1);

    } finally {
      streamManager.unsubscribeFromStream(subscriptionId);
    }
  });
});