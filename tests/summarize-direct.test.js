import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SummarizeOperator } from '../src/operators/summarize.js';
import { sum, count } from '../src/operators/index.js';
import { AggregationExpression } from '../src/aggregations/core/aggregation-expression.js';

describe('Summarize Operations - Direct Testing', () => {
  it('should summarize data without window when flushed', async () => {
    // Create a summarize operator directly
    const aggregationSpec = {
      total_amount: new AggregationExpression('sum', [new AggregationExpression('safeGet', ['amount'])]),
      count: count()
    };
    
    const groupByCallback = (item) => item.product;
    
    // Create the operator without a window
    const summarizeOp = new SummarizeOperator(aggregationSpec, groupByCallback, null);
    
    // Collect results
    const results = [];
    summarizeOp.downstream = {
      push: (item) => results.push(item),
      process: async (item) => results.push(item)
    };
    
    // Push test data
    await summarizeOp.process({ product: 'laptop', amount: 1200 });
    await summarizeOp.process({ product: 'laptop', amount: 1100 });
    await summarizeOp.process({ product: 'mouse', amount: 25 });
    await summarizeOp.process({ product: 'mouse', amount: 30 });
    
    // Before flush, no results should be emitted (no window)
    expect(results).toHaveLength(0);
    
    // Flush to trigger final output
    await summarizeOp.flush();
    
    // Now we should have summarized results
    expect(results.length).toBeGreaterThan(0);
    
    console.log('Direct test results:', JSON.stringify(results, null, 2));
    
    // Verify the summarized data (sorted by total for consistency)
    results.sort((a, b) => a.total_amount - b.total_amount);
    
    expect(results).toHaveLength(2);
    expect(results[0].total_amount).toBe(55); // mouse: 25 + 30
    expect(results[0].count).toBe(2);
    
    expect(results[1].total_amount).toBe(2300); // laptop: 1200 + 1100
    expect(results[1].count).toBe(2);
    
    console.log('✅ Direct summarize test results:', results);
  });
  
  it('should handle empty data gracefully', async () => {
    const aggregationSpec = {
      total_amount: new AggregationExpression('sum', [new AggregationExpression('safeGet', ['amount'])]),
      count: count()
    };
    
    const groupByCallback = (item) => item.product;
    const summarizeOp = new SummarizeOperator(aggregationSpec, groupByCallback, null);
    
    const results = [];
    summarizeOp.downstream = {
      push: (item) => results.push(item),
      process: async (item) => results.push(item)
    };
    
    // Flush without any data
    await summarizeOp.flush();
    
    // Should have no results
    expect(results).toHaveLength(0);
  });
  
  it('should handle single group correctly', async () => {
    const aggregationSpec = {
      total_amount: new AggregationExpression('sum', [new AggregationExpression('safeGet', ['amount'])]),
      count: count()
    };
    
    const groupByCallback = (item) => item.product;
    const summarizeOp = new SummarizeOperator(aggregationSpec, groupByCallback, null);
    
    const results = [];
    summarizeOp.downstream = {
      push: (item) => results.push(item),
      process: async (item) => results.push(item)
    };
    
    // Add data for only one product
    await summarizeOp.process({ product: 'laptop', amount: 1200 });
    await summarizeOp.process({ product: 'laptop', amount: 800 });
    
    await summarizeOp.flush();
    
    expect(results).toHaveLength(1);
    expect(results[0].total_amount).toBe(2000);
    expect(results[0].count).toBe(2);
  });
});