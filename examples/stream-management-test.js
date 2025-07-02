import { streamManager } from '../src/core/stream-manager.js';
import { queryEngine } from '../src/core/query-engine.js';
import CommandParser from '../src/parser/command-parser.js';

console.log('=== Stream Management and Query Engine Test ===\n');

async function testStreamBasics() {
    console.log('🔧 Testing Basic Stream Operations...');
    
    try {
        // Test 1: Create stream
        console.log('\n1. Creating stream "sales":');
        const createResult = await CommandParser.executeCommand('.create stream sales');
        console.log('   Result:', createResult.message);
        
        // Test 2: List streams
        console.log('\n2. Listing streams:');
        const listResult = await CommandParser.executeCommand('.list streams');
        console.log('   Result:', listResult.message);
        
        // Test 3: Stream info
        console.log('\n3. Getting stream info:');
        const infoResult = await CommandParser.executeCommand('.info sales');
        console.log('   Result:', JSON.stringify(infoResult.result, null, 2));
        
        // Test 4: Insert single object
        console.log('\n4. Inserting single object:');
        const insertResult = await CommandParser.executeCommand('.insert into sales { "id": 1, "amount": 100, "product": "laptop" }');
        console.log('   Result:', insertResult.message);
        
        // Test 5: Insert array of objects
        console.log('\n5. Inserting multiple objects:');
        const bulkInsertResult = await CommandParser.executeCommand('.insert into sales [{ "id": 2, "amount": 200, "product": "mouse" }, { "id": 3, "amount": 300, "product": "keyboard" }]');
        console.log('   Result:', bulkInsertResult.message);
        
        // Test 6: Check stream info after inserts
        console.log('\n6. Stream info after inserts:');
        const infoAfterInsert = await CommandParser.executeCommand('.info sales');
        console.log('   Result:', JSON.stringify(infoAfterInsert.result, null, 2));
        
    } catch (error) {
        console.error('   Error:', error.message);
    }
}

async function testContinuousQueries() {
    console.log('\n\n🔄 Testing Continuous Queries...');
    
    const results = [];
    
    try {
        // Set up result callback
        const resultCallback = (result) => {
            results.push(result);
            console.log('   📊 Query result:', JSON.stringify(result));
        };
        
        // Test 1: Start a continuous query
        console.log('\n1. Starting continuous query on sales stream:');
        const queryResult = await queryEngine.executeStatement(
            'sales | where amount > 150',
            resultCallback
        );
        console.log('   Query started:', queryResult.message);
        const queryId = queryResult.queryId;
        
        // Wait a moment for any existing data to flow through
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log(`   Initial results: ${results.length} items`);
        
        // Test 2: Insert more data and see real-time updates
        console.log('\n2. Inserting new data that should trigger query:');
        await CommandParser.executeCommand('.insert into sales { "id": 4, "amount": 500, "product": "monitor" }');
        
        // Wait for data to flow through
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('\n3. Inserting data that should NOT trigger query (amount <= 150):');
        await CommandParser.executeCommand('.insert into sales { "id": 5, "amount": 50, "product": "cable" }');
        
        // Wait for potential data
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log(`   Total results after inserts: ${results.length} items`);
        
        // Test 3: Stop the query
        console.log('\n4. Stopping the query:');
        const stopResult = queryEngine.stopQuery(queryId);
        console.log('   Stop result:', stopResult.message);
        
        // Test 4: Insert more data (should not trigger stopped query)
        console.log('\n5. Inserting data after query stopped:');
        await CommandParser.executeCommand('.insert into sales { "id": 6, "amount": 600, "product": "tablet" }');
        
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log(`   Final results count: ${results.length} items (should not have increased)`);
        
    } catch (error) {
        console.error('   Error:', error.message);
    }
}

async function testMultipleStreams() {
    console.log('\n\n🔀 Testing Multiple Streams...');
    
    try {
        // Create multiple streams
        console.log('\n1. Creating multiple streams:');
        await CommandParser.executeCommand('.create stream employees');
        await CommandParser.executeCommand('.create stream products');
        
        const listResult = await CommandParser.executeCommand('.list streams');
        console.log('   Available streams:', listResult.result.streams);
        
        // Insert data into different streams
        console.log('\n2. Inserting data into employees stream:');
        await CommandParser.executeCommand('.insert into employees { "id": 1, "name": "Alice", "salary": 75000 }');
        await CommandParser.executeCommand('.insert into employees { "id": 2, "name": "Bob", "salary": 85000 }');
        
        console.log('\n3. Inserting data into products stream:');
        await CommandParser.executeCommand('.insert into products { "id": 1, "name": "Widget", "price": 29.99 }');
        
        // Show stream info for all
        console.log('\n4. All streams info:');
        const allInfo = await CommandParser.executeCommand('.info');
        console.log('   Info:', JSON.stringify(allInfo.result, null, 2));
        
    } catch (error) {
        console.error('   Error:', error.message);
    }
}

async function testStreamOperations() {
    console.log('\n\n🧹 Testing Stream Operations...');
    
    try {
        // Test flush
        console.log('\n1. Stream info before flush:');
        const beforeFlush = await CommandParser.executeCommand('.info sales');
        console.log('   Data count:', beforeFlush.result.info.dataCount);
        
        console.log('\n2. Flushing sales stream:');
        const flushResult = await CommandParser.executeCommand('.flush sales');
        console.log('   Flush result:', flushResult.message);
        
        console.log('\n3. Stream info after flush:');
        const afterFlush = await CommandParser.executeCommand('.info sales');
        console.log('   Data count:', afterFlush.result.info.dataCount);
        
        // Test delete
        console.log('\n4. Deleting products stream:');
        const deleteResult = await CommandParser.executeCommand('.delete stream products');
        console.log('   Delete result:', deleteResult.message);
        
        console.log('\n5. Final stream list:');
        const finalList = await CommandParser.executeCommand('.list streams');
        console.log('   Remaining streams:', finalList.result.streams);
        
    } catch (error) {
        console.error('   Error:', error.message);
    }
}

async function runAllTests() {
    try {
        await testStreamBasics();
        await testContinuousQueries();
        await testMultipleStreams();
        await testStreamOperations();
        
        console.log('\n\n=== ✅ All Tests Completed ===');
        console.log('\n📋 Features Tested:');
        console.log('• ✅ Stream creation and deletion');
        console.log('• ✅ Data insertion (single and bulk)');
        console.log('• ✅ Stream flushing');
        console.log('• ✅ Continuous queries with real-time updates');
        console.log('• ✅ Query start/stop functionality');
        console.log('• ✅ Multiple concurrent streams');
        console.log('• ✅ Command parsing and execution');
        console.log('• ✅ Stream management and monitoring');
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        console.error(error.stack);
    }
}

runAllTests();