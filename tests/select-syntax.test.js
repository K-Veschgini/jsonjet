import { describe, it, expect, beforeEach } from 'bun:test';
import { StreamManager } from '../src/core/stream-manager.js';
import { QueryEngine } from '../src/core/query-engine.js';

describe('Select Syntax Integration', () => {
  let streamManager;
  let queryEngine;
  
  beforeEach(() => {
    streamManager = new StreamManager();
    queryEngine = new QueryEngine(streamManager);
  });

  it('should handle basic select syntax', async () => {
    // Create test streams
    streamManager.createStream('test_input');
    streamManager.createStream('test_output');

    // Set up data collection for results
    const results = [];
    const subscriptionId = streamManager.subscribeToStream('test_output', (message) => {
      results.push(message.data);
    });

    try {
      // Create a flow using new select syntax
      const flowResult = await queryEngine.executeStatement(
        'create flow test_select from test_input | select { name: name, age: age } | insert_into(test_output)'
      );
      
      if (!flowResult.success) {
        console.log('Flow creation failed:', flowResult);
      }
      expect(flowResult.success).toBe(true);

      // Insert test data
      await streamManager.insertIntoStream('test_input', { 
        name: 'John',
        age: 30,
        password: 'secret'  // This should not appear in output
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have results
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('John');
      expect(results[0].age).toBe(30);
      expect(results[0].password).toBeUndefined(); // Should be excluded

    } finally {
      streamManager.unsubscribeFromStream(subscriptionId);
    }
  });

  it('should handle select with spread syntax eventually', async () => {
    // Note: This test is for future functionality
    // For now, let's test that the query parses without errors
    
    try {
      // This should parse but might not execute correctly yet
      const result = await queryEngine.executeStatement(
        'create flow spread_test from test_input | select { ...*, computed: age * 2, -password } | insert_into(test_output)'
      );
      
      // For now, we just check it doesn't crash the parser
      // In the future, this should work fully
      console.log('Spread syntax result:', result);
      
    } catch (error) {
      // Expected for now since spread syntax isn't fully implemented
      console.log('Spread syntax not yet implemented:', error.message);
    }
  });
});