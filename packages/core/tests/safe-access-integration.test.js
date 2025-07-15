import { describe, it, expect, beforeEach } from 'bun:test';
import { createInstances } from '../src/instances.js';

describe('Safe Access Integration', () => {
  let streamManager;
  let queryEngine;
  
  beforeEach(() => {
    const instances = createInstances();
    streamManager = instances.streamManager;
    queryEngine = instances.queryEngine;
  });

  it('should handle missing fields gracefully in flows', async () => {
    // Create test streams
    streamManager.createStream('test_input');
    streamManager.createStream('test_output');

    // Set up data collection for results
    const results = [];
    const subscriptionId = streamManager.subscribeToStream('test_output', (message) => {
      results.push(message.data);
    });

    try {
      // Create a flow that accesses potentially missing fields
      const flowResult = await queryEngine.executeStatement(
        'create flow safe_test as\ntest_input | select { name: name, missing: missing_field } | insert_into(test_output)'
      );
      
      expect(flowResult.success).toBe(true);

      // Insert test data with missing fields
      await streamManager.insertIntoStream('test_input', { 
        name: 'John',
        user: { profile: { name: 'John Doe' } }
        // missing_field is not present
      });

      await streamManager.insertIntoStream('test_input', { 
        name: 'Jane'
        // user is not present, so user.profile.name will be undefined
      });

      await streamManager.insertIntoStream('test_input', { 
        name: 'Bob',
        user: { email: 'bob@example.com' }
        // user.profile is not present
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have results even with missing fields
      expect(results.length).toBe(3);

      // Check first result
      expect(results[0].name).toBe('John');
      expect(results[0].missing).toBeUndefined();

      // Check second result
      expect(results[1].name).toBe('Jane');
      expect(results[1].missing).toBeUndefined();

      // Check third result
      expect(results[2].name).toBe('Bob');
      expect(results[2].missing).toBeUndefined();

    } finally {
      streamManager.unsubscribeFromStream(subscriptionId);
    }
  });

  it('should handle null values gracefully', async () => {
    // Create test streams
    streamManager.createStream('null_input');
    streamManager.createStream('null_output');

    // Set up data collection for results
    const results = [];
    const subscriptionId = streamManager.subscribeToStream('null_output', (message) => {
      results.push(message.data);
    });

    try {
      // Create a flow that accesses potentially null fields
      const flowResult = await queryEngine.executeStatement(
        'create flow null_test as\nnull_input | select { name: name } | insert_into(null_output)'
      );
      
      expect(flowResult.success).toBe(true);

      // Insert test data with null values
      await streamManager.insertIntoStream('null_input', { 
        name: 'Test',
        user: {
          address: null  // This will cause user.address.street to be undefined
        }
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have results even with null intermediate values
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Test');

    } finally {
      streamManager.unsubscribeFromStream(subscriptionId);
    }
  });
});