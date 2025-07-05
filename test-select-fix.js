import { transpileQuery } from './src/parser/query-transpiler.js';

// Test the select syntax that was failing
const testQuery = 'user_data | select { name: name, age: age, email: email }';

console.log('Testing select syntax transpilation...');
console.log('Query:', testQuery);

try {
    const result = transpileQuery(testQuery);
    
    console.log('\nTranspiled JavaScript:');
    console.log(result.javascript);
    
    console.log('\nSuccess! No "unexpected token :" error');
    
    // Check if the output contains proper safeGet calls
    if (result.javascript.includes('safeGet(item, \'name\')')) {
        console.log('✅ Proper safeGet generation working');
    } else {
        console.log('❌ safeGet generation may not be working correctly');
    }
    
} catch (error) {
    console.error('❌ Transpilation failed:', error.message);
}