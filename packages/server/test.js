#!/usr/bin/env bun

/**
 * Simple test to demonstrate ResonanceDB Server functionality
 */

import ResonanceDBServer from './src/index.js';

async function runTest() {
  console.log('🧪 Starting ResonanceDB Server Test...\n');
  
  // Start the server
  const server = new ResonanceDBServer(3001);
  const instance = server.start();
  
  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    // Test 1: Create a stream
    console.log('📝 Test 1: Creating a stream...');
    const createResponse = await fetch('http://localhost:3001/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'create stream users' })
    });
    const createResult = await createResponse.json();
    console.log('✅ Create stream result:', createResult);
    
    // Test 2: List streams
    console.log('\n📝 Test 2: Listing streams...');
    const streamsResponse = await fetch('http://localhost:3001/api/streams');
    const streamsResult = await streamsResponse.json();
    console.log('✅ Streams list:', streamsResult);
    
    // Test 3: Server status
    console.log('\n📝 Test 3: Checking server status...');
    const statusResponse = await fetch('http://localhost:3001/api/status');
    const statusResult = await statusResponse.json();
    console.log('✅ Server status:', statusResult);
    
    // Test 4: WebSocket connection and stream subscription
    console.log('\n📝 Test 4: Testing WebSocket subscription...');
    
    const ws = new WebSocket('ws://localhost:3001/ws');
    
    await new Promise((resolve, reject) => {
      let messageCount = 0;
      
      ws.onopen = () => {
        console.log('📡 WebSocket connected');
        
        // Subscribe to the users stream
        ws.send(JSON.stringify({
          type: 'subscribe',
          streamName: 'users'
        }));
      };
      
      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log('📡 Received:', message);
        
        messageCount++;
        
        if (message.type === 'subscribed') {
          console.log('✅ Successfully subscribed to stream');
          
          // Insert test data via HTTP API
          console.log('📝 Inserting test data...');
          await fetch('http://localhost:3001/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: 'insert into users {"name": "Alice", "age": 30}' 
            })
          });
          
          await fetch('http://localhost:3001/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: 'insert into users {"name": "Bob", "age": 25}' 
            })
          });
        }
        
        if (message.type === 'data') {
          console.log('📊 Received data from stream:', message.data);
          
          // After receiving 2 data messages, we're done
          if (messageCount >= 4) { // connected + subscribed + 2 data messages
            ws.close();
            resolve();
          }
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        ws.close();
        reject(new Error('Test timeout'));
      }, 5000);
    });
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ HTTP API for query execution and commands');
    console.log('✅ Stream creation and listing via HTTP');
    console.log('✅ WebSocket subscription for real-time data');
    console.log('✅ Clean separation: HTTP for requests, WS for streaming');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Stop the server
    instance.stop();
    console.log('\n🔽 Server stopped');
  }
}

// Run the test
runTest().catch(console.error); 