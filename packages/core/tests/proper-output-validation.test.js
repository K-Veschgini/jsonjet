import { describe, it, expect, beforeEach } from 'bun:test';
import { createInstances } from '../src/instances.js';

describe('PROPER Output Validation Tests', () => {
  let streamManager;
  let queryEngine;
  
  beforeEach(() => {
    const instances = createInstances();
    streamManager = instances.streamManager;
    queryEngine = instances.queryEngine;
  });

  // Helper to collect ALL data from a stream with exact outputs
  const collectExactOutputs = (streamName, expectedCount, timeout = 200) => {
    return new Promise((resolve, reject) => {
      const results = [];
      const subscriptionId = streamManager.subscribeToStream(streamName, (message) => {
        results.push(message.data);
      });
      
      setTimeout(() => {
        streamManager.unsubscribeFromStream(subscriptionId);
        if (results.length !== expectedCount) {
          reject(new Error(`Expected ${expectedCount} results, got ${results.length}. Results: ${JSON.stringify(results)}`));
        } else {
          resolve(results);
        }
      }, timeout);
    });
  };

  describe('WHERE Clause - Exact Filtering Validation', () => {
    
    it('should filter exactly based on age condition', async () => {
      streamManager.createStream('input');
      streamManager.createStream('output');
      
      const flowResult = await queryEngine.executeStatement(
        'create flow age_filter as\ninput | where age >= 21 | insert_into(output)'
      );
      expect(flowResult.success).toBe(true);
      
      // Start collecting - we expect exactly 2 results
      const resultsPromise = collectExactOutputs('output', 2);
      
      // Insert test data with precise age boundaries
      await streamManager.insertIntoStream('input', { name: 'Under21', age: 20 });    // Should be FILTERED
      await streamManager.insertIntoStream('input', { name: 'Exactly21', age: 21 });  // Should PASS
      await streamManager.insertIntoStream('input', { name: 'Over21', age: 25 });     // Should PASS
      await streamManager.insertIntoStream('input', { name: 'Under21_2', age: 18 });  // Should be FILTERED
      
      const results = await resultsPromise;
      
      // Validate EXACT outputs
      expect(results).toHaveLength(2);
      
      // Validate exact data that passed through
      const names = results.map(r => r.name).sort();
      expect(names).toEqual(['Exactly21', 'Over21']);
      
      // Validate exact ages
      const ages = results.map(r => r.age).sort();
      expect(ages).toEqual([21, 25]);
      
      // Ensure filtered data is NOT present
      const hasUnder21 = results.some(r => r.age < 21);
      expect(hasUnder21).toBe(false);
    });

    it('should handle complex WHERE conditions with exact boolean logic', async () => {
      streamManager.createStream('users');
      streamManager.createStream('filtered');
      
      const flowResult = await queryEngine.executeStatement(
        'create flow complex_filter as\nusers | where (age >= 18 && status == "active") || role == "admin" | insert_into(filtered)'
      );
      expect(flowResult.success).toBe(true);
      
      // Expect exactly 3 results based on our test data
      const resultsPromise = collectExactOutputs('filtered', 3);
      
      // Insert test data with exact boundary conditions
      await streamManager.insertIntoStream('users', { name: 'Adult_Active', age: 18, status: 'active', role: 'user' });     // PASS: age>=18 && active
      await streamManager.insertIntoStream('users', { name: 'Adult_Inactive', age: 25, status: 'inactive', role: 'user' }); // FAIL: age>=18 but not active, not admin
      await streamManager.insertIntoStream('users', { name: 'Minor_Admin', age: 16, status: 'inactive', role: 'admin' });   // PASS: role==admin
      await streamManager.insertIntoStream('users', { name: 'Minor_Active', age: 17, status: 'active', role: 'user' });     // FAIL: age<18 and not admin
      await streamManager.insertIntoStream('users', { name: 'Adult_Admin', age: 30, status: 'inactive', role: 'admin' });   // PASS: role==admin
      
      const results = await resultsPromise;
      
      // Validate EXACT results
      const passedNames = results.map(r => r.name).sort();
      expect(passedNames).toEqual(['Adult_Active', 'Adult_Admin', 'Minor_Admin']);
      
      // Validate the logic worked exactly right
      results.forEach(result => {
        const passesAgeAndStatus = result.age >= 18 && result.status === 'active';
        const isAdmin = result.role === 'admin';
        expect(passesAgeAndStatus || isAdmin).toBe(true);
      });
    });
  });

  describe('SELECT Clause - Exact Field Transformation', () => {
    
    it('should select exactly the specified fields and exclude others', async () => {
      streamManager.createStream('raw_users');
      streamManager.createStream('clean_users');
      
      const flowResult = await queryEngine.executeStatement(
        'create flow field_select as\nraw_users | select { name: name, age: age, email: email } | insert_into(clean_users)'
      );
      expect(flowResult.success).toBe(true);
      
      const resultsPromise = collectExactOutputs('clean_users', 1);
      
      // Insert data with many fields, only some should be selected
      await streamManager.insertIntoStream('raw_users', {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        password: 'secret123',
        ssn: '123-45-6789',
        address: '123 Main St',
        phone: '555-1234',
        creditCard: '4111-1111-1111-1111'
      });
      
      const results = await resultsPromise;
      const result = results[0];
      
      // Validate EXACTLY the selected fields are present
      expect(result.name).toBe('John Doe');
      expect(result.age).toBe(30);
      expect(result.email).toBe('john@example.com');
      
      // Validate EXACTLY that sensitive fields are excluded
      expect(result.password).toBeUndefined();
      expect(result.ssn).toBeUndefined();
      expect(result.address).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.creditCard).toBeUndefined();
      
      // Validate EXACT object structure
      const expectedKeys = ['name', 'age', 'email'];
      const actualKeys = Object.keys(result).sort();
      expect(actualKeys).toEqual(expectedKeys.sort());
    });

    it('should handle logical operators with exact value transformations', async () => {
      streamManager.createStream('input_data');
      streamManager.createStream('transformed_data');
      
      const flowResult = await queryEngine.executeStatement(
        'create flow logical_transform as\ninput_data | select { name: name, safe_age: age || 0, has_both: active && verified, either_flag: flag1 || flag2 } | insert_into(transformed_data)'
      );
      expect(flowResult.success).toBe(true);
      
      const resultsPromise = collectExactOutputs('transformed_data', 4);
      
      // Insert test data with exact logical conditions
      await streamManager.insertIntoStream('input_data', { name: 'Test1', age: null, active: true, verified: true, flag1: false, flag2: false });
      await streamManager.insertIntoStream('input_data', { name: 'Test2', age: 25, active: false, verified: true, flag1: true, flag2: false });
      await streamManager.insertIntoStream('input_data', { name: 'Test3', active: true, verified: false, flag1: false, flag2: true }); // missing age
      await streamManager.insertIntoStream('input_data', { name: 'Test4', age: 0, active: false, verified: false, flag1: false, flag2: false });
      
      const results = await resultsPromise;
      
      // Sort results by name for predictable testing
      results.sort((a, b) => a.name.localeCompare(b.name));
      
      // Test1: age=null, active=true, verified=true, flag1=false, flag2=false
      expect(results[0].name).toBe('Test1');
      expect(results[0].safe_age).toBe(0);        // null || 0 = 0
      expect(results[0].has_both).toBe(true);     // true && true = true
      expect(results[0].either_flag).toBe(false); // false || false = false
      
      // Test2: age=25, active=false, verified=true, flag1=true, flag2=false
      expect(results[1].name).toBe('Test2');
      expect(results[1].safe_age).toBe(25);       // 25 || 0 = 25
      expect(results[1].has_both).toBe(false);    // false && true = false
      expect(results[1].either_flag).toBe(true);  // true || false = true
      
      // Test3: age=undefined, active=true, verified=false, flag1=false, flag2=true
      expect(results[2].name).toBe('Test3');
      expect(results[2].safe_age).toBe(0);        // undefined || 0 = 0
      expect(results[2].has_both).toBe(false);    // true && false = false
      expect(results[2].either_flag).toBe(true);  // false || true = true
      
      // Test4: age=0, active=false, verified=false, flag1=false, flag2=false
      expect(results[3].name).toBe('Test4');
      expect(results[3].safe_age).toBe(0);        // 0 || 0 = 0 (0 is falsy but first operand)
      expect(results[3].has_both).toBe(false);    // false && false = false
      expect(results[3].either_flag).toBe(false); // false || false = false
    });
  });

  describe('PROJECT Clause - Exact Computed Fields', () => {
    
    it('should compute fields with exact mathematical operations', async () => {
      streamManager.createStream('sales_data');
      streamManager.createStream('computed_sales');
      
      const flowResult = await queryEngine.executeStatement(
        'create flow compute_sales as\nsales_data | select { product: product, quantity: quantity, price: price, total: quantity * price, tax: quantity * price * 0.1 } | insert_into(computed_sales)'
      );
      expect(flowResult.success).toBe(true);
      
      const resultsPromise = collectExactOutputs('computed_sales', 2);
      
      // Insert precise test data for mathematical validation
      await streamManager.insertIntoStream('sales_data', { product: 'Widget A', quantity: 10, price: 5.99 });
      await streamManager.insertIntoStream('sales_data', { product: 'Widget B', quantity: 3, price: 12.50 });
      
      const results = await resultsPromise;
      results.sort((a, b) => a.product.localeCompare(b.product));
      
      // Widget A: 10 * 5.99 = 59.9, tax = 59.9 * 0.1 = 5.99
      expect(results[0].product).toBe('Widget A');
      expect(results[0].quantity).toBe(10);
      expect(results[0].price).toBe(5.99);
      expect(results[0].total).toBeCloseTo(59.9, 2);
      expect(results[0].tax).toBeCloseTo(5.99, 2);
      
      // Widget B: 3 * 12.50 = 37.5, tax = 37.5 * 0.1 = 3.75
      expect(results[1].product).toBe('Widget B');
      expect(results[1].quantity).toBe(3);
      expect(results[1].price).toBe(12.50);
      expect(results[1].total).toBeCloseTo(37.5, 2);
      expect(results[1].tax).toBeCloseTo(3.75, 2);
    });

    it('should handle string concatenation with exact results', async () => {
      streamManager.createStream('person_data');
      streamManager.createStream('formatted_names');
      
      const flowResult = await queryEngine.executeStatement(
        'create flow format_names as\nperson_data | select { id: id, full_name: first_name + " " + last_name, email_domain: "@" + domain, display: first_name + " (" + role + ")" } | insert_into(formatted_names)'
      );
      expect(flowResult.success).toBe(true);
      
      const resultsPromise = collectExactOutputs('formatted_names', 1);
      
      await streamManager.insertIntoStream('person_data', {
        id: 123,
        first_name: 'Jane',
        last_name: 'Smith',
        domain: 'company.com',
        role: 'Manager'
      });
      
      const results = await resultsPromise;
      const result = results[0];
      
      // Validate EXACT string concatenation results
      expect(result.id).toBe(123);
      expect(result.full_name).toBe('Jane Smith');
      expect(result.email_domain).toBe('@company.com');
      expect(result.display).toBe('Jane (Manager)');
    });
  });

  describe('Multi-Stage Pipeline - Exact Transformations', () => {
    
    it('should process exact multi-stage transformation pipeline', async () => {
      streamManager.createStream('raw_orders');
      streamManager.createStream('processed_orders');
      
      // Complex multi-stage pipeline
      const flowResult = await queryEngine.executeStatement(`
        create flow process_orders as
        raw_orders
        | where status == "pending" && amount > 100
        | select { order_id: order_id, customer: customer_name, amount: amount, priority: urgent || false }
        | select { order_id: order_id, customer: customer, amount: amount, priority: priority, fee: amount * 0.03, total: amount + (amount * 0.03) }
        | insert_into(processed_orders)
      `);
      expect(flowResult.success).toBe(true);
      
      const resultsPromise = collectExactOutputs('processed_orders', 2);
      
      // Insert test data with exact filtering and transformation conditions
      await streamManager.insertIntoStream('raw_orders', { order_id: 1, customer_name: 'Alice', amount: 50, status: 'pending', urgent: true });     // FILTERED: amount <= 100
      await streamManager.insertIntoStream('raw_orders', { order_id: 2, customer_name: 'Bob', amount: 150, status: 'completed', urgent: false }); // FILTERED: status != "pending"
      await streamManager.insertIntoStream('raw_orders', { order_id: 3, customer_name: 'Carol', amount: 200, status: 'pending', urgent: true });   // PASS
      await streamManager.insertIntoStream('raw_orders', { order_id: 4, customer_name: 'Dave', amount: 300, status: 'pending' });                   // PASS: urgent is undefined, urgent || false = false
      
      const results = await resultsPromise;
      results.sort((a, b) => a.order_id - b.order_id);
      
      // Order 3: amount=200, urgent=true, fee=200*0.03=6, total=200+6=206
      expect(results[0].order_id).toBe(3);
      expect(results[0].customer).toBe('Carol');
      expect(results[0].amount).toBe(200);
      expect(results[0].priority).toBe(true);         // urgent || false = true
      expect(results[0].fee).toBeCloseTo(6, 2);       // 200 * 0.03
      expect(results[0].total).toBeCloseTo(206, 2);   // 200 + 6
      
      // Order 4: amount=300, urgent=undefined, fee=300*0.03=9, total=300+9=309
      expect(results[1].order_id).toBe(4);
      expect(results[1].customer).toBe('Dave');
      expect(results[1].amount).toBe(300);
      expect(results[1].priority).toBe(false);        // undefined || false = false
      expect(results[1].fee).toBeCloseTo(9, 2);       // 300 * 0.03
      expect(results[1].total).toBeCloseTo(309, 2);   // 300 + 9
    });
  });

  describe('Edge Cases - Exact Boundary Conditions', () => {
    
    it('should handle null, undefined, and zero values with exact logic', async () => {
      streamManager.createStream('edge_input');
      streamManager.createStream('edge_output');
      
      const flowResult = await queryEngine.executeStatement(
        'create flow edge_cases as\nedge_input | select { id: id, safe_value: value || "default", zero_check: count || 1, both_check: flag1 && flag2 } | insert_into(edge_output)'
      );
      expect(flowResult.success).toBe(true);
      
      const resultsPromise = collectExactOutputs('edge_output', 5);
      
      // Test exact edge cases
      await streamManager.insertIntoStream('edge_input', { id: 1, value: null, count: 0, flag1: true, flag2: true });
      await streamManager.insertIntoStream('edge_input', { id: 2, value: '', count: null, flag1: false, flag2: true });
      await streamManager.insertIntoStream('edge_input', { id: 3, value: 'actual', flag1: true, flag2: false });  // missing count
      await streamManager.insertIntoStream('edge_input', { id: 4, value: 0, count: 5, flag1: null, flag2: true });
      await streamManager.insertIntoStream('edge_input', { id: 5 }); // missing everything except id
      
      const results = await resultsPromise;
      results.sort((a, b) => a.id - b.id);
      
      // Test case 1: null value, 0 count, true && true
      expect(results[0].id).toBe(1);
      expect(results[0].safe_value).toBe('default');  // null || "default"
      expect(results[0].zero_check).toBe(1);          // 0 || 1 = 1 (0 is falsy)
      expect(results[0].both_check).toBe(true);       // true && true
      
      // Test case 2: empty string, null count, false && true
      expect(results[1].id).toBe(2);
      expect(results[1].safe_value).toBe('default');  // '' || "default" = "default" (empty string is falsy)
      expect(results[1].zero_check).toBe(1);          // null || 1
      expect(results[1].both_check).toBe(false);      // false && true
      
      // Test case 3: actual value, undefined count, true && false
      expect(results[2].id).toBe(3);
      expect(results[2].safe_value).toBe('actual');   // 'actual' || "default"
      expect(results[2].zero_check).toBe(1);          // undefined || 1
      expect(results[2].both_check).toBe(false);      // true && false
      
      // Test case 4: 0 value, 5 count, null && true
      expect(results[3].id).toBe(4);
      expect(results[3].safe_value).toBe('default');  // 0 || "default" (0 is falsy)
      expect(results[3].zero_check).toBe(5);          // 5 || 1
      expect(results[3].both_check).toBe(null);       // null && true (returns null due to short-circuit)
      
      // Test case 5: all undefined
      expect(results[4].id).toBe(5);
      expect(results[4].safe_value).toBe('default');  // undefined || "default"
      expect(results[4].zero_check).toBe(1);          // undefined || 1
      expect(results[4].both_check).toBe(undefined);  // undefined && undefined (returns undefined due to short-circuit)
    });
  });

  describe('Demo Exact Validation', () => {
    
    it('should validate flow processing demo with exact expected output', async () => {
      streamManager.createStream('user_data');
      streamManager.createStream('archive');
      
      const flowResult = await queryEngine.executeStatement(
        'create flow process_users as\nuser_data | where age > 18 | select { name: name, age: age, status: "processed" } | insert_into(archive)'
      );
      
      if (!flowResult.success) {
        throw new Error(`Flow processing demo is BROKEN: ${flowResult.message}`);
      }
      
      const resultsPromise = collectExactOutputs('archive', 2);
      
      // Insert exact demo data
      await streamManager.insertIntoStream('user_data', { name: 'Alice', age: 25, city: 'NYC', job: 'Engineer' });
      await streamManager.insertIntoStream('user_data', { name: 'Bob', age: 16, city: 'LA', job: 'Student' });    // Should be filtered
      await streamManager.insertIntoStream('user_data', { name: 'Carol', age: 30, city: 'SF', job: 'Manager' });
      
      const results = await resultsPromise;
      results.sort((a, b) => a.name.localeCompare(b.name));
      
      // Validate EXACT demo output
      expect(results[0].name).toBe('Alice');
      expect(results[0].age).toBe(25);
      expect(results[0].status).toBe('processed');
      expect(results[0].city).toBeUndefined();    // Should be excluded by select
      expect(results[0].job).toBeUndefined();     // Should be excluded by select
      
      expect(results[1].name).toBe('Carol');
      expect(results[1].age).toBe(30);
      expect(results[1].status).toBe('processed');
      expect(results[1].city).toBeUndefined();    // Should be excluded by select
      expect(results[1].job).toBeUndefined();     // Should be excluded by select
      
      // Verify Bob was filtered out
      const bobResult = results.find(r => r.name === 'Bob');
      expect(bobResult).toBeUndefined();
    });
  });
});