console.log('🧪 COMPREHENSIVE TEST RUNNER - Finding Issues After Refactor\n');

async function runAllTests() {
    const tests = [
        {
            name: 'Basic Transpiler Import',
            test: async () => {
                const { transpileQuery } = await import('../src/parser/query-transpiler.js');
                const result = transpileQuery('data | where age > 18');
                return result.javascript.length > 0;
            }
        },
        {
            name: 'New Transpiler Architecture Import',
            test: async () => {
                const { transpileQuery } = await import('../src/parser/transpiler/index.js');
                const result = transpileQuery('data | where age > 18');
                return result.javascript.length > 0;
            }
        },
        {
            name: 'JavaScript Generation Validity',
            test: async () => {
                const { transpileQuery } = await import('../src/parser/query-transpiler.js');
                const result = transpileQuery('data | select { name: name, age: age }');
                
                // Try to parse as JavaScript
                const selectCode = result.javascript.match(/\(item\) => \((.+)\)\)/)?.[1];
                if (!selectCode) throw new Error('No select code found');
                
                // Remove trailing parenthesis if present
                const cleanSelectCode = selectCode.replace(/\)$/, '');
                new Function('item', 'safeGet', `return ${cleanSelectCode}`);
                return true;
            }
        },
        {
            name: 'Safe Property Access',
            test: async () => {
                const { safeGet } = await import('../src/utils/safe-access.js');
                
                const testObj = { name: 'test', nested: { value: 42 } };
                
                // Test basic access
                if (safeGet(testObj, 'name') !== 'test') return false;
                
                // Test nested access
                if (safeGet(testObj, 'nested.value') !== 42) return false;
                
                // Test safe null access
                if (safeGet(null, 'anything') !== undefined) return false;
                
                // Test missing property
                if (safeGet(testObj, 'missing') !== undefined) return false;
                
                return true;
            }
        },
        {
            name: 'Stream Manager Basic Operations',
            test: async () => {
                const { StreamManager } = await import('../src/core/stream-manager.js');
                const streamManager = new StreamManager();
                
                // Create stream
                streamManager.createStream('test');
                const streams = streamManager.listStreams();
                if (!streams.includes('test')) return false;
                
                // Insert data
                await streamManager.insertIntoStream('test', { id: 1, name: 'test' });
                
                return true;
            }
        },
        {
            name: 'Query Engine Basic Flow Creation',
            test: async () => {
                const { StreamManager } = await import('../src/core/stream-manager.js');
                const { QueryEngine } = await import('../src/core/query-engine.js');
                
                const streamManager = new StreamManager();
                const queryEngine = new QueryEngine(streamManager);
                
                streamManager.createStream('input');
                streamManager.createStream('output');
                
                const result = await queryEngine.executeStatement(
                    'create flow test from input | where age > 18 | insert_into(output)'
                );
                
                return result.success;
            }
        },
        {
            name: 'End-to-End Data Flow',
            test: async () => {
                const { StreamManager } = await import('../src/core/stream-manager.js');
                const { QueryEngine } = await import('../src/core/query-engine.js');
                
                const streamManager = new StreamManager();
                const queryEngine = new QueryEngine(streamManager);
                
                streamManager.createStream('input');
                streamManager.createStream('output');
                
                // Collect results
                const results = [];
                const subscriptionId = streamManager.subscribeToStream('output', (message) => {
                    results.push(message.data);
                });
                
                try {
                    // Create flow
                    const flowResult = await queryEngine.executeStatement(
                        'create flow test from input | where age > 18 | insert_into(output)'
                    );
                    
                    if (!flowResult.success) {
                        throw new Error(`Flow creation failed: ${flowResult.message}`);
                    }
                    
                    // Insert data
                    await streamManager.insertIntoStream('input', { name: 'Adult', age: 25 });
                    await streamManager.insertIntoStream('input', { name: 'Child', age: 15 });
                    
                    // Wait for processing
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Should have 1 result (Adult, not Child)
                    return results.length === 1 && results[0].name === 'Adult';
                    
                } finally {
                    streamManager.unsubscribeFromStream(subscriptionId);
                }
            }
        },
        {
            name: 'Select Operation with Field Filtering',
            test: async () => {
                const { StreamManager } = await import('../src/core/stream-manager.js');
                const { QueryEngine } = await import('../src/core/query-engine.js');
                
                const streamManager = new StreamManager();
                const queryEngine = new QueryEngine(streamManager);
                
                streamManager.createStream('input');
                streamManager.createStream('output');
                
                const results = [];
                const subscriptionId = streamManager.subscribeToStream('output', (message) => {
                    results.push(message.data);
                });
                
                try {
                    const flowResult = await queryEngine.executeStatement(
                        'create flow test from input | select { name: name, age: age } | insert_into(output)'
                    );
                    
                    if (!flowResult.success) {
                        throw new Error(`Select flow creation failed: ${flowResult.message}`);
                    }
                    
                    await streamManager.insertIntoStream('input', { 
                        name: 'Test', 
                        age: 30, 
                        password: 'secret',
                        ssn: '123-45-6789'
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (results.length !== 1) return false;
                    
                    const result = results[0];
                    return result.name === 'Test' && 
                           result.age === 30 && 
                           result.password === undefined && 
                           result.ssn === undefined;
                    
                } finally {
                    streamManager.unsubscribeFromStream(subscriptionId);
                }
            }
        },
        {
            name: 'Logical Operators in Select',
            test: async () => {
                const { StreamManager } = await import('../src/core/stream-manager.js');
                const { QueryEngine } = await import('../src/core/query-engine.js');
                
                const streamManager = new StreamManager();
                const queryEngine = new QueryEngine(streamManager);
                
                streamManager.createStream('input');
                streamManager.createStream('output');
                
                const results = [];
                const subscriptionId = streamManager.subscribeToStream('output', (message) => {
                    results.push(message.data);
                });
                
                try {
                    const flowResult = await queryEngine.executeStatement(
                        'create flow test from input | select { name: name, safe_age: age || 0 } | insert_into(output)'
                    );
                    
                    if (!flowResult.success) {
                        throw new Error(`Logical operators flow failed: ${flowResult.message}`);
                    }
                    
                    await streamManager.insertIntoStream('input', { name: 'Test', age: null });
                    
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (results.length !== 1) return false;
                    
                    const result = results[0];
                    return result.name === 'Test' && result.safe_age === 0;
                    
                } finally {
                    streamManager.unsubscribeFromStream(subscriptionId);
                }
            }
        }
    ];
    
    console.log(`Running ${tests.length} tests...\n`);
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of tests) {
        try {
            console.log(`Testing: ${testCase.name}...`);
            const result = await testCase.test();
            
            if (result) {
                console.log(`✅ PASS: ${testCase.name}`);
                passed++;
            } else {
                console.log(`❌ FAIL: ${testCase.name} (returned false)`);
                failed++;
            }
        } catch (error) {
            console.log(`💥 ERROR: ${testCase.name}`);
            console.log(`   ${error.message}`);
            failed++;
        }
        console.log('');
    }
    
    console.log('=== TEST SUMMARY ===');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
    
    if (failed > 0) {
        console.log('\n🚨 ISSUES FOUND! The refactor broke some functionality.');
        console.log('These tests show exactly what needs to be fixed.');
    } else {
        console.log('\n🎉 ALL TESTS PASS! The refactor is working correctly.');
    }
}

runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
});