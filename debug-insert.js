#!/usr/bin/env bun
import { InsertInto } from './src/operators/insert-into.js';
import { streamManager } from './src/core/stream-manager.js';

console.log('Testing InsertInto operator...');

// Create a test stream
streamManager.createStream('test_target');

// Create an InsertInto operator
const insertOp = new InsertInto(streamManager, 'test_target');
console.log('InsertInto created with:', { 
  targetStreamManager: !!insertOp.targetStreamManager,
  targetStreamName: insertOp.targetStreamName 
});

// Set up a simple results collector
const results = [];
streamManager.subscribeToStream('test_target', (message) => {
  results.push(message.data);
});

// Test the operator
async function test() {
  try {
    await insertOp.process({ test: 'data' });
    console.log('✅ InsertInto processed successfully');
    console.log('Results:', results);
  } catch (error) {
    console.log('❌ InsertInto failed:', error.message);
  }
}

test();