import { test, expect } from 'bun:test';
import { createInstances } from '../src/instances.js';

test('exp function > should work within select operation', async () => {
    const { streamManager, queryEngine } = createInstances();
    
    // Create test streams
    streamManager.createStream('test_input');
    streamManager.createStream('test_output');
    
    // Collect results
    const results = [];
    streamManager.subscribeToStream('test_output', ({ data }) => {
        results.push(data);
    });
    
    // Create flow using exp function
    const query = 'create flow test_exp as\ntest_input | select { value: value, exp_value: exp(value) } | insert_into(test_output)';
    await queryEngine.executeStatement(query);
    
    // Insert test data
    await streamManager.insertIntoStream('test_input', { value: 1 });
    await streamManager.insertIntoStream('test_input', { value: 0 });
    await streamManager.insertIntoStream('test_input', { value: 2 });
    
    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Verify results
    expect(results).toHaveLength(3);
    
    // Check exp(1) ≈ e
    expect(results[0].value).toBe(1);
    expect(results[0].exp_value).toBeCloseTo(Math.E, 10);
    
    // Check exp(0) = 1
    expect(results[1].value).toBe(0);
    expect(results[1].exp_value).toBe(1);
    
    // Check exp(2) ≈ e²
    expect(results[2].value).toBe(2);
    expect(results[2].exp_value).toBeCloseTo(Math.E * Math.E, 10);
});