import { transpileQuery } from './src/parser/query-transpiler.js';

console.log('=== TESTING SELECT TRANSPILER FIX ===\n');

const query = 'user_data | select { name: name, age: age, email: email } | insert_into(clean_output)';

console.log('Query:', query);

try {
    const result = transpileQuery(query);
    console.log('✅ Transpilation successful!');
    console.log('');
    console.log('Generated JavaScript:');
    console.log(result.javascript);
    console.log('');
    
    // Test if the select part is valid JavaScript
    const selectMatch = result.javascript.match(/\(item\) => \((.+)\)\)/);
    if (selectMatch) {
        const objectCode = selectMatch[1];
        console.log('Object literal:', objectCode);
        
        // Test if it's valid JavaScript by trying to evaluate it
        try {
            const testFunction = new Function('item', 'safeGet', `return (${objectCode});`);
            const mockSafeGet = (obj, prop) => obj[prop];
            const testItem = { name: 'John', age: 30, email: 'john@test.com' };
            
            const testResult = testFunction(testItem, mockSafeGet);
            console.log('✅ Object literal is valid JavaScript');
            console.log('Test result:', testResult);
            
            // Check if all expected fields are present
            if (testResult.name === 'John' && testResult.age === 30 && testResult.email === 'john@test.com') {
                console.log('✅ Select function works correctly!');
            } else {
                console.log('❌ Select function returned wrong values');
            }
            
        } catch (evalError) {
            console.log('❌ Object literal has syntax errors:', evalError.message);
        }
    } else {
        console.log('❌ Could not find select function in generated code');
    }
    
} catch (error) {
    console.error('❌ Transpilation failed:', error.message);
}

console.log('\n=== TEST COMPLETE ===');