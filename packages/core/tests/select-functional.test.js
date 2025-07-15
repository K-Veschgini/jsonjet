import { describe, it, expect, beforeEach } from 'bun:test';
import { createInstances } from '../src/instances.js';

describe('Select Functional Tests', () => {
  let streamManager;
  let queryEngine;
  
  beforeEach(() => {
    const instances = createInstances();
    streamManager = instances.streamManager;
    queryEngine = instances.queryEngine;
  });

  it('should actually pass data through select pipeline', async () => {
    console.log('\n=== FUNCTIONAL TEST: Select Data Flow ===');
    
    // Step 1: Create streams
    console.log('1. Creating streams...');
    streamManager.createStream('user_data');
    streamManager.createStream('clean_output');
    
    // Step 2: Set up data collection from output stream
    const outputData = [];
    const subscriptionId = streamManager.subscribeToStream('clean_output', (message) => {
      console.log('📤 Received in clean_output:', message.data);
      outputData.push(message.data);
    });

    try {
      // Step 3: Create the select flow
      console.log('2. Creating select flow...');
      const flowResult = await queryEngine.executeStatement(
        'create flow basic_select as\nuser_data | select { name: name, age: age, email: email } | insert_into(clean_output)'
      );
      
      console.log('Flow creation result:', flowResult);
      expect(flowResult.success).toBe(true);

      // Step 4: Insert test data
      console.log('3. Inserting test data...');
      await streamManager.insertIntoStream('user_data', { 
        name: 'John',
        age: 30,
        email: 'john@example.com',
        password: 'secret123',  // This should NOT appear in output
        extra: 'ignored'        // This should NOT appear in output
      });

      // Step 5: Wait for data to flow through pipeline
      console.log('4. Waiting for data processing...');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 6: Check results
      console.log('5. Checking results...');
      console.log('Output data received:', outputData);
      
      expect(outputData.length).toBe(1);
      const result = outputData[0];
      
      // Should have selected fields
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
      expect(result.email).toBe('john@example.com');
      
      // Should NOT have excluded fields
      expect(result.password).toBeUndefined();
      expect(result.extra).toBeUndefined();
      
      console.log('✅ Data flowed correctly through select pipeline!');

    } finally {
      streamManager.unsubscribeFromStream(subscriptionId);
    }
  });

  it('should handle missing fields safely', async () => {
    console.log('\n=== FUNCTIONAL TEST: Missing Fields ===');
    
    streamManager.createStream('input_stream');
    streamManager.createStream('output_stream');
    
    const outputData = [];
    const subscriptionId = streamManager.subscribeToStream('output_stream', (message) => {
      outputData.push(message.data);
    });

    try {
      // Create flow that expects fields that might be missing
      const flowResult = await queryEngine.executeStatement(
        'create flow safe_select as\ninput_stream | select { name: name, age: age, email: email } | insert_into(output_stream)'
      );
      
      expect(flowResult.success).toBe(true);

      // Insert data with missing fields
      await streamManager.insertIntoStream('input_stream', { 
        name: 'Jane',
        age: 25
        // email is missing - should be undefined in output
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(outputData.length).toBe(1);
      const result = outputData[0];
      
      expect(result.name).toBe('Jane');
      expect(result.age).toBe(25);
      expect(result.email).toBeUndefined(); // Should be safely undefined, not error
      
      console.log('✅ Missing fields handled safely');

    } finally {
      streamManager.unsubscribeFromStream(subscriptionId);
    }
  });

  it('should handle logical operators in select', async () => {
    console.log('\n=== FUNCTIONAL TEST: Logical Operators ===');
    
    streamManager.createStream('test_input');
    streamManager.createStream('test_output');
    
    const outputData = [];
    const subscriptionId = streamManager.subscribeToStream('test_output', (message) => {
      outputData.push(message.data);
    });

    try {
      // Test the || operator that was failing
      const flowResult = await queryEngine.executeStatement(
        'create flow logical_test as\ntest_input | select { name: name, safe_age: age || 0, has_email: email && true } | insert_into(test_output)'
      );
      
      console.log('Logical operators flow result:', flowResult);
      expect(flowResult.success).toBe(true);

      // Insert data with null age to test || operator
      await streamManager.insertIntoStream('test_input', { 
        name: 'Bob',
        age: null,
        email: 'bob@test.com'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(outputData.length).toBe(1);
      const result = outputData[0];
      
      expect(result.name).toBe('Bob');
      expect(result.safe_age).toBe(0); // null || 0 should be 0
      expect(result.has_email).toBe(true); // 'bob@test.com' && true should be true
      
      console.log('✅ Logical operators working correctly');

    } finally {
      streamManager.unsubscribeFromStream(subscriptionId);
    }
  });

  it('should debug why clean_output is empty', async () => {
    console.log('\n=== DEBUG TEST: Why is clean_output empty? ===');
    
    // Recreate the exact scenario from the demo
    streamManager.createStream('user_data');
    streamManager.createStream('clean_output');
    
    // Debug: Check what streams exist
    console.log('Available streams:', streamManager.listStreams());
    
    const allMessages = [];
    const globalSub = streamManager.subscribeToAllStreams((message) => {
      console.log(`📨 Message in ${message.streamName}:`, message.data);
      allMessages.push({ stream: message.streamName, data: message.data });
    });

    try {
      // Step by step debugging
      console.log('\n--- Creating select flow ---');
      const flowResult = await queryEngine.executeStatement(
        'create flow basic_select as\nuser_data | select { name: name, age: age, email: email } | insert_into(clean_output)'
      );
      
      console.log('Flow creation result:', flowResult);
      if (!flowResult.success) {
        console.error('❌ Flow creation failed:', flowResult.message);
        return;
      }
      
      console.log('\n--- Checking active flows ---');
      const activeFlows = queryEngine.getActiveFlows();
      console.log('Active flows:', activeFlows.length);
      activeFlows.forEach(flow => {
        console.log(`  - Flow ${flow.queryId}: ${flow.sourceStream} -> processing`);
      });
      
      console.log('\n--- Inserting test data ---');
      await streamManager.insertIntoStream('user_data', { 
        name: 'John',
        age: 30,
        email: 'john@example.com',
        password: 'secret123'
      });
      
      console.log('Data inserted into user_data');
      
      console.log('\n--- Waiting for processing ---');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('\n--- Final results ---');
      console.log('All messages received:', allMessages);
      
      const cleanOutputMessages = allMessages.filter(m => m.stream === 'clean_output');
      console.log('Messages in clean_output:', cleanOutputMessages);
      
      if (cleanOutputMessages.length === 0) {
        console.log('❌ No data in clean_output - pipeline is broken!');
        
        // Check if data even made it to user_data
        const userDataMessages = allMessages.filter(m => m.stream === 'user_data');
        console.log('Messages in user_data:', userDataMessages);
        
        if (userDataMessages.length === 0) {
          console.log('❌ Data didn\'t even make it to user_data');
        } else {
          console.log('✅ Data is in user_data, but not flowing through select pipeline');
        }
      } else {
        console.log('✅ Data successfully flowed through pipeline');
      }

    } finally {
      streamManager.unsubscribeFromAllStreams(globalSub);
    }
  });
});