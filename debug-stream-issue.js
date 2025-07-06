#!/usr/bin/env node

// Let's test the stream creation and insertion logic
import { StreamManager } from './src/core/stream-manager.js';

const streamManager = new StreamManager();

try {
    console.log('=== Testing Stream Management ===');
    
    // Test 1: List streams initially
    console.log('\n1. List streams initially:');
    const initialStreams = streamManager.listStreams();
    console.log('Initial streams:', initialStreams);
    
    // Test 2: Create users stream
    console.log('\n2. Creating users stream:');
    try {
        const createResult = streamManager.createStream('users');
        console.log('Create result:', createResult);
    } catch (error) {
        console.log('Create error:', error.message);
    }
    
    // Test 3: List streams after creation
    console.log('\n3. List streams after creation:');
    const afterCreateStreams = streamManager.listStreams();
    console.log('Streams after create:', afterCreateStreams);
    
    // Test 4: Try to create users stream again (should fail)
    console.log('\n4. Try to create users stream again:');
    try {
        const createResult2 = streamManager.createStream('users');
        console.log('Second create result:', createResult2);
    } catch (error) {
        console.log('Expected error on second create:', error.message);
    }
    
    // Test 5: Try to insert into users stream
    console.log('\n5. Try to insert into users stream:');
    const testData = {
        "id": 2,
        "name": "Bob",
        "scores": [88, 76, 91]
    };
    
    try {
        const insertResult = streamManager.insertIntoStream('users', testData);
        console.log('Insert result:', insertResult);
    } catch (error) {
        console.log('Insert error:', error.message);
    }
    
    // Test 6: Check if stream exists
    console.log('\n6. Check if users stream exists:');
    const exists = streamManager.streamExists('users');
    console.log('Stream exists:', exists);
    
} catch (error) {
    console.log('Fatal error:', error.message);
    console.log('Stack:', error.stack);
}