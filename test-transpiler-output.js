import { transpileQuery } from './src/parser/query-transpiler.js';

console.log('Testing transpiler output for select syntax...\n');

const testQueries = [
    'user_data | select { name: name }',
    'user_data | select { age: age }', 
    'user_data | select { name: name, age: age }',
    'user_data | select { computed: age + 1 }',
    'user_data | select { safe_age: age || 0 }'
];

for (const query of testQueries) {
    console.log(`Query: ${query}`);
    
    try {
        const result = transpileQuery(query);
        console.log('Generated JavaScript:');
        console.log(result.javascript);
        
        // Check if it looks valid
        if (result.javascript.includes('safeGet(item,')) {
            console.log('✅ Uses safeGet correctly');
        } else if (result.javascript.includes(': name') && !result.javascript.includes('safeGet')) {
            console.log('❌ Raw variable access - this will cause "Unexpected token" errors');
        }
        
    } catch (error) {
        console.log('❌ Transpilation error:', error.message);
    }
    
    console.log('---\n');
}