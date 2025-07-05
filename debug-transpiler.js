import { transpileQuery } from './src/parser/query-transpiler.js';

console.log('=== DEBUGGING TRANSPILER OUTPUT ===\n');

// Test the exact select query from the demo
const query = 'user_data | select { name: name, age: age, email: email } | insert_into(clean_output)';

console.log('Query:', query);
console.log('');

try {
  const result = transpileQuery(query);
  
  console.log('✅ Transpilation successful');
  console.log('');
  console.log('Generated JavaScript:');
  console.log('---');
  console.log(result.javascript);
  console.log('---');
  console.log('');
  
  // Test if the generated JavaScript is syntactically valid
  console.log('Testing JavaScript syntax validity...');
  try {
    // Try to create a function with the generated code to see if it's valid
    const testFunction = new Function('Stream', 'Operators', 'safeGet', `
      const item = { name: 'test', age: 25, email: 'test@example.com' };
      return ${result.javascript.replace('.pipe(new Operators.Select((item) =>', '').replace('))', '').replace('.pipe(insertIntoFactory(\'clean_output\'))', '')};
    `);
    
    console.log('✅ Generated JavaScript is syntactically valid');
    
    // Test execution
    const mockSafeGet = (obj, prop) => obj[prop];
    const testResult = testFunction(null, null, mockSafeGet);
    console.log('Test execution result:', testResult);
    
  } catch (jsError) {
    console.log('❌ Generated JavaScript has syntax errors:');
    console.log(jsError.message);
  }
  
} catch (transpileError) {
  console.error('❌ Transpilation failed:', transpileError.message);
  console.error('Stack:', transpileError.stack);
}

// Also test individual parts
console.log('\n=== TESTING INDIVIDUAL SELECT SYNTAX ===');

const selectTests = [
  '{ name: name }',
  '{ name: name, age: age }', 
  '{ name: name, age: age, email: email }',
  '{ computed: age + 1 }',
  '{ safe_age: age || 0 }'
];

for (const selectSyntax of selectTests) {
  console.log(`\nTesting: select ${selectSyntax}`);
  
  try {
    const testQuery = `test_stream | select ${selectSyntax}`;
    const result = transpileQuery(testQuery);
    
    // Extract just the select part
    const selectPart = result.javascript.match(/\(item\) => (.+)\)/);
    if (selectPart) {
      console.log('Select function:', selectPart[1]);
    }
    
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
}

console.log('\n=== DEBUG COMPLETE ===');