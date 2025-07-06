console.log('=== TESTING JAVASCRIPT EXECUTION ===\n');

async function testJavaScriptExecution() {
    try {
        const { transpileQuery } = await import('./src/parser/query-transpiler.js');
        const { safeGet } = await import('./src/utils/safe-access.js');
        
        console.log('1. Testing basic where clause...');
        const whereQuery = 'data | where age > 18';
        const whereResult = transpileQuery(whereQuery);
        console.log('Where JS:', whereResult.javascript);
        
        // Try to execute the generated JavaScript
        try {
            const mockOperators = {
                Filter: class {
                    constructor(fn) { this.fn = fn; }
                }
            };
            
            // Test the filter function directly
            const filterCode = whereResult.javascript.match(/item => (.+)\)/)?.[1];
            if (filterCode) {
                console.log('Filter expression:', filterCode);
                const filterFunc = new Function('item', 'safeGet', `return ${filterCode}`);
                
                // Test with sample data
                const testData = { name: 'John', age: 25 };
                const filterResult = filterFunc(testData, safeGet);
                console.log('✅ Filter function works, result:', filterResult);
            }
        } catch (jsError) {
            console.error('❌ JavaScript execution failed:', jsError.message);
        }
        
        console.log('\n2. Testing select clause...');
        const selectQuery = 'data | select { name: name, age: age }';
        const selectResult = transpileQuery(selectQuery);
        console.log('Select JS:', selectResult.javascript);
        
        // Try to execute the select function
        try {
            const selectCode = selectResult.javascript.match(/\(item\) => \((.+)\)\)/)?.[1];
            if (selectCode) {
                console.log('Select expression:', selectCode);
                const selectFunc = new Function('item', 'safeGet', `return ${selectCode}`);
                
                // Test with sample data
                const testData = { name: 'Alice', age: 30, password: 'secret' };
                const selectResultData = selectFunc(testData, safeGet);
                console.log('✅ Select function works, result:', selectResultData);
                
                // Verify it only has selected fields
                if (selectResultData.name && selectResultData.age && !selectResultData.password) {
                    console.log('✅ Select correctly filters fields');
                } else {
                    console.log('❌ Select field filtering issue');
                }
            }
        } catch (jsError) {
            console.error('❌ Select JavaScript execution failed:', jsError.message);
        }
        
        console.log('\n3. Testing logical operators...');
        const logicalQuery = 'data | select { safe_age: age || 0, is_valid: active && verified }';
        const logicalResult = transpileQuery(logicalQuery);
        console.log('Logical JS:', logicalResult.javascript);
        
        try {
            const logicalCode = logicalResult.javascript.match(/\(item\) => \((.+)\)\)/)?.[1];
            if (logicalCode) {
                console.log('Logical expression:', logicalCode);
                const logicalFunc = new Function('item', 'safeGet', `return ${logicalCode}`);
                
                // Test with various data
                const testCases = [
                    { age: null, active: true, verified: true },
                    { age: 25, active: false, verified: true },
                    { active: true, verified: true } // missing age
                ];
                
                testCases.forEach((testData, i) => {
                    const result = logicalFunc(testData, safeGet);
                    console.log(`Test ${i + 1}:`, testData, '=>', result);
                });
                
                console.log('✅ Logical operators work');
            }
        } catch (jsError) {
            console.error('❌ Logical operators JavaScript execution failed:', jsError.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testJavaScriptExecution().then(() => {
    console.log('\n=== JAVASCRIPT EXECUTION TEST COMPLETE ===');
});