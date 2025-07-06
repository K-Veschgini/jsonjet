import { createStream, createFlow, insertIntoFactory } from './demo-bun/src/jsdb/index.js';

// Test the exclusion syntax
const testData = [
  { id: 1, name: 'John', password: 'secret123', ssn: '123-45-6789', age: 25 },
  { id: 2, name: 'Jane', password: 'pass456', ssn: '987-65-4321', age: 30 }
];

// Create streams
const userData = createStream('user_data');
const excludedOutput = createStream('excluded_output');

// Create flow with exclusion syntax
const flow = createFlow('user_data | select { ...*, -password, -ssn, safe_age: age } | insert_into(excluded_output)');

// Insert test data
testData.forEach(item => userData.insert(item));

// Wait a bit for processing
setTimeout(() => {
  console.log('Results:');
  excludedOutput.toArray().forEach(item => {
    console.log('Item:', item);
    console.log('Has password:', 'password' in item);
    console.log('Has ssn:', 'ssn' in item);
    console.log('---');
  });
}, 100);