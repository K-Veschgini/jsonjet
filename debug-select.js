import { parseQuery } from './src/parser/query-parser.js';
import { transpileQuery } from './src/parser/query-transpiler.js';

console.log('Debugging select syntax step by step...\n');

// Test the exact problematic query
const testQuery = 'user_data | select { name: name, age: age, email: email }';

console.log('Query:', testQuery);
console.log('');

try {
    console.log('=== PARSING ===');
    const parseResult = parseQuery(testQuery);
    console.log('✅ Parsing successful');
    console.log('Parse errors:', parseResult.parseErrors);
    console.log('Lex errors:', parseResult.lexErrors);
    
    // Show the CST structure for debugging
    console.log('\n=== CST STRUCTURE ===');
    console.log('CST:', JSON.stringify(parseResult.cst, null, 2));
    
    console.log('\n=== TRANSPILING ===');
    const transpileResult = transpileQuery(testQuery);
    console.log('✅ Transpilation successful');
    console.log('JavaScript:', transpileResult.javascript);
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}

// Also test a simpler version
console.log('\n\n=== TESTING SIMPLER VERSION ===');
const simpleQuery = 'user_data | select { name: name }';
console.log('Simple query:', simpleQuery);

try {
    const result = transpileQuery(simpleQuery);
    console.log('✅ Simple query works');
    console.log('JavaScript:', result.javascript);
} catch (error) {
    console.error('❌ Simple query failed:', error.message);
}