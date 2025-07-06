import { streamManager } from './demo-bun/src/jsdb/core/stream-manager.js';
import { queryEngine } from './demo-bun/src/jsdb/core/query-engine.js';

async function testLogicalOperators() {
  try {
    // Create streams
    await queryEngine.executeStatement('create stream test_data');
    await queryEngine.executeStatement('create stream output');
    
    // Set up a subscriber to collect results
    const results = [];
    const subscriptionId = streamManager.subscribeToStream('output', (message) => {
      results.push(message.data);
    });
    
    // Create flow
    const flowResult = await queryEngine.executeStatement(
      'create flow logical_test from test_data | select { name: name, safe_value: value || "default", has_flag: flag && true } | insert_into(output)'
    );
    console.log('Flow result:', flowResult);
    
    // Insert test data
    await streamManager.insertIntoStream('test_data', { name: 'Test1', value: null, flag: null });
    
    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Results:', results);
    
    if (results.length > 0) {
      const result = results[0];
      console.log('name:', result.name);
      console.log('safe_value:', result.safe_value, '(expected: "default")');
      console.log('has_flag:', result.has_flag, '(expected: false)');
      console.log('has_flag type:', typeof result.has_flag);
    }
    
    // Cleanup
    streamManager.unsubscribeFromStream(subscriptionId);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogicalOperators();