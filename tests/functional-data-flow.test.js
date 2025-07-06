import { describe, it, expect, beforeEach } from 'bun:test';
import { StreamManager } from '../src/core/stream-manager.js';
import { QueryEngine } from '../src/core/query-engine.js';

describe('Functional Data Flow Tests - Real Pipeline Validation', () => {
  let streamManager;
  let queryEngine;
  
  beforeEach(() => {
    streamManager = new StreamManager();
    queryEngine = new QueryEngine(streamManager);
  });

  // Helper function to wait for async processing
  const waitForProcessing = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper function to collect data from a stream
  const collectFromStream = (streamName, timeout = 100) => {
    return new Promise((resolve) => {
      const results = [];
      const subscriptionId = streamManager.subscribeToStream(streamName, (message) => {
        results.push(message.data);
      });
      
      setTimeout(() => {
        streamManager.unsubscribeFromStream(subscriptionId);
        resolve(results);
      }, timeout);
    });
  };

  describe('Basic Pipeline Operations', () => {
    
    it('should flow data through WHERE filter', async () => {
      // Setup
      streamManager.createStream('input');
      streamManager.createStream('output');
      
      // Create flow
      const flowResult = await queryEngine.executeStatement(
        'create flow filter_test from input | where age > 18 | insert_into(output)'
      );
      expect(flowResult.success).toBe(true);
      
      // Start collecting results
      const resultsPromise = collectFromStream('output');
      
      // Insert test data
      await streamManager.insertIntoStream('input', { name: 'John', age: 25 });  // Should pass
      await streamManager.insertIntoStream('input', { name: 'Jane', age: 16 });  // Should be filtered
      await streamManager.insertIntoStream('input', { name: 'Bob', age: 22 });   // Should pass
      
      await waitForProcessing();
      
      const results = await resultsPromise;
      
      // Verify
      expect(results.length).toBe(2);
      expect(results[0].name).toBe('John');
      expect(results[0].age).toBe(25);
      expect(results[1].name).toBe('Bob');
      expect(results[1].age).toBe(22);
    });

    it('should flow data through SELECT transformation', async () => {
      // Setup
      streamManager.createStream('users');
      streamManager.createStream('transformed');
      
      // Create flow with SELECT
      const flowResult = await queryEngine.executeStatement(
        'create flow select_test from users | select { name: name, age: age, email: email } | insert_into(transformed)'
      );
      
      if (!flowResult.success) {
        console.error('Flow creation failed:', flowResult.message);
      }
      expect(flowResult.success).toBe(true);
      
      // Start collecting results
      const resultsPromise = collectFromStream('transformed');
      
      // Insert test data with extra fields
      await streamManager.insertIntoStream('users', { 
        name: 'Alice', 
        age: 30, 
        email: 'alice@test.com',
        password: 'secret123',  // Should be excluded
        ssn: '123-45-6789'      // Should be excluded
      });
      
      await waitForProcessing();
      
      const results = await resultsPromise;
      
      // Verify transformation
      expect(results.length).toBe(1);
      const result = results[0];
      expect(result.name).toBe('Alice');
      expect(result.age).toBe(30);
      expect(result.email).toBe('alice@test.com');
      expect(result.password).toBeUndefined(); // Should be excluded
      expect(result.ssn).toBeUndefined();      // Should be excluded
    });

    it('should handle logical operators in SELECT', async () => {
      // Setup
      streamManager.createStream('data');
      streamManager.createStream('processed');
      
      // Create flow with logical operators
      const flowResult = await queryEngine.executeStatement(
        'create flow logical_test from data | select { name: name, safe_age: age || 0, is_valid: active && verified } | insert_into(processed)'
      );
      
      if (!flowResult.success) {
        console.error('Logical operators flow failed:', flowResult.message);
        console.error('This indicates an issue with the transpiler refactor');
      }
      expect(flowResult.success).toBe(true);
      
      // Start collecting results
      const resultsPromise = collectFromStream('processed');
      
      // Insert test data
      await streamManager.insertIntoStream('data', { 
        name: 'Test1',
        age: null,           // age || 0 should be 0
        active: true,
        verified: true       // active && verified should be true
      });
      
      await streamManager.insertIntoStream('data', { 
        name: 'Test2',
        age: 25,            // age || 0 should be 25
        active: false,
        verified: true      // active && verified should be false
      });
      
      await waitForProcessing();
      
      const results = await resultsPromise;
      
      // Verify logical operators work
      expect(results.length).toBe(2);
      
      const result1 = results[0];
      expect(result1.name).toBe('Test1');
      expect(result1.safe_age).toBe(0);        // null || 0 = 0
      expect(result1.is_valid).toBe(true);     // true && true = true
      
      const result2 = results[1];
      expect(result2.name).toBe('Test2');
      expect(result2.safe_age).toBe(25);       // 25 || 0 = 25
      expect(result2.is_valid).toBe(false);    // false && true = false
    });
  });

  describe('Complex Pipeline Operations', () => {
    
    it('should handle multi-stage pipelines', async () => {
      // Setup
      streamManager.createStream('raw_data');
      streamManager.createStream('final_output');
      
      // Create complex pipeline: filter -> transform -> filter again
      const flowResult = await queryEngine.executeStatement(`
        create flow complex_pipeline from raw_data 
        | where age >= 18 
        | select { name: name, adult_age: age, status: "adult" }
        | where adult_age <= 65
        | insert_into(final_output)
      `);
      
      if (!flowResult.success) {
        console.error('Complex pipeline failed:', flowResult.message);
      }
      expect(flowResult.success).toBe(true);
      
      // Start collecting results
      const resultsPromise = collectFromStream('final_output');
      
      // Insert test data
      await streamManager.insertIntoStream('raw_data', { name: 'Teen', age: 16 });     // Filtered by first WHERE
      await streamManager.insertIntoStream('raw_data', { name: 'Adult', age: 30 });    // Should pass
      await streamManager.insertIntoStream('raw_data', { name: 'Senior', age: 70 });   // Filtered by second WHERE
      await streamManager.insertIntoStream('raw_data', { name: 'Middle', age: 45 });   // Should pass
      
      await waitForProcessing();
      
      const results = await resultsPromise;
      
      // Verify complex pipeline
      expect(results.length).toBe(2);
      
      const adult = results.find(r => r.name === 'Adult');
      expect(adult).toBeDefined();
      expect(adult.adult_age).toBe(30);
      expect(adult.status).toBe('adult');
      
      const middle = results.find(r => r.name === 'Middle');
      expect(middle).toBeDefined();
      expect(middle.adult_age).toBe(45);
      expect(middle.status).toBe('adult');
    });

  });

  describe('Edge Cases and Error Handling', () => {
    
    it('should handle missing fields gracefully', async () => {
      // Setup
      streamManager.createStream('sparse_data');
      streamManager.createStream('safe_output');
      
      // Create flow that expects fields that might be missing
      const flowResult = await queryEngine.executeStatement(
        'create flow safe_select from sparse_data | select { name: name, age: age, email: email } | insert_into(safe_output)'
      );
      
      expect(flowResult.success).toBe(true);
      
      // Start collecting results
      const resultsPromise = collectFromStream('safe_output');
      
      // Insert incomplete data
      await streamManager.insertIntoStream('sparse_data', { name: 'Complete', age: 25, email: 'test@example.com' });
      await streamManager.insertIntoStream('sparse_data', { name: 'Partial', age: 30 }); // Missing email
      await streamManager.insertIntoStream('sparse_data', { name: 'Minimal' });          // Missing age and email
      
      await waitForProcessing();
      
      const results = await resultsPromise;
      
      // Verify safe handling of missing fields
      expect(results.length).toBe(3);
      
      const complete = results[0];
      expect(complete.name).toBe('Complete');
      expect(complete.age).toBe(25);
      expect(complete.email).toBe('test@example.com');
      
      const partial = results[1];
      expect(partial.name).toBe('Partial');
      expect(partial.age).toBe(30);
      expect(partial.email).toBeUndefined(); // Should be safely undefined
      
      const minimal = results[2];
      expect(minimal.name).toBe('Minimal');
      expect(minimal.age).toBeUndefined();   // Should be safely undefined
      expect(minimal.email).toBeUndefined(); // Should be safely undefined
    });

    it('should handle null and undefined values in logical operators', async () => {
      // Setup
      streamManager.createStream('null_data');
      streamManager.createStream('null_output');
      
      // Create flow with logical operators that handle null
      const flowResult = await queryEngine.executeStatement(
        'create flow null_test from null_data | select { name: name, safe_value: value || "default", has_flag: flag && true } | insert_into(null_output)'
      );
      
      expect(flowResult.success).toBe(true);
      
      // Start collecting results
      const resultsPromise = collectFromStream('null_output');
      
      // Insert test data with null/undefined values
      await streamManager.insertIntoStream('null_data', { name: 'Test1', value: null, flag: null });
      await streamManager.insertIntoStream('null_data', { name: 'Test2', value: 'actual', flag: true });
      await streamManager.insertIntoStream('null_data', { name: 'Test3' }); // Missing fields
      
      await waitForProcessing();
      
      const results = await resultsPromise;
      
      // Verify null handling
      expect(results.length).toBe(3);
      
      const test1 = results[0];
      expect(test1.name).toBe('Test1');
      expect(test1.safe_value).toBe('default');  // null || "default"
      expect(test1.has_flag).toBe(null);         // null && true (returns null)
      
      const test2 = results[1];
      expect(test2.name).toBe('Test2');
      expect(test2.safe_value).toBe('actual');   // "actual" || "default"
      expect(test2.has_flag).toBe(true);         // true && true
      
      const test3 = results[2];
      expect(test3.name).toBe('Test3');
      expect(test3.safe_value).toBe('default');  // undefined || "default"
      expect(test3.has_flag).toBe(undefined);    // undefined && true (returns undefined)
    });
  });

  describe('Demo Validation', () => {
    
    it('should validate flow processing demo works', async () => {
      // This is the actual flow from the demo - it should work!
      streamManager.createStream('user_data');
      streamManager.createStream('archive');
      
      // Test the exact flow from flow-processing demo
      const flowResult = await queryEngine.executeStatement(
        'create flow process_users from user_data | where age > 18 | select { name: name, age: age, status: "processed" } | insert_into(archive)'
      );
      
      if (!flowResult.success) {
        console.error('❌ DEMO BROKEN - Flow processing demo failed:', flowResult.message);
        console.error('This is exactly why we need these tests!');
      }
      expect(flowResult.success).toBe(true);
      
      // Start collecting results  
      const resultsPromise = collectFromStream('archive');
      
      // Insert demo data
      await streamManager.insertIntoStream('user_data', { name: 'Alice', age: 25, city: 'NYC' });
      await streamManager.insertIntoStream('user_data', { name: 'Bob', age: 16, city: 'LA' });   // Should be filtered
      await streamManager.insertIntoStream('user_data', { name: 'Carol', age: 30, city: 'SF' });
      
      await waitForProcessing();
      
      const results = await resultsPromise;
      
      // This should have 2 results (Bob filtered out)
      console.log('Flow processing demo results:', results);
      expect(results.length).toBe(2);
      
      results.forEach(result => {
        expect(result.name).toBeDefined();
        expect(result.age).toBeGreaterThan(18);
        expect(result.status).toBe('processed');
      });
    });

    it('should validate select demo works', async () => {
      // Test the exact select demo
      streamManager.createStream('user_data');
      streamManager.createStream('clean_output');
      
      const flowResult = await queryEngine.executeStatement(
        'create flow basic_select from user_data | select { name: name, age: age, email: email } | insert_into(clean_output)'
      );
      
      if (!flowResult.success) {
        console.error('❌ SELECT DEMO BROKEN:', flowResult.message);
      }
      expect(flowResult.success).toBe(true);
      
      // Start collecting results
      const resultsPromise = collectFromStream('clean_output');
      
      // Insert demo data
      await streamManager.insertIntoStream('user_data', { 
        name: 'John', 
        age: 30, 
        email: 'john@example.com',
        password: 'secret123',
        ssn: '123-45-6789'
      });
      
      await waitForProcessing();
      
      const results = await resultsPromise;
      
      console.log('Select demo results:', results);
      expect(results.length).toBe(1);
      
      const result = results[0];
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
      expect(result.email).toBe('john@example.com');
      expect(result.password).toBeUndefined(); // Should be excluded
      expect(result.ssn).toBeUndefined();      // Should be excluded
    });
  });
});