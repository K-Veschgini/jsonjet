import { transpileQuery } from './src/parser/query-transpiler.js';

console.log('Testing logical operators and select syntax...\n');

// Test cases
const testCases = [
    {
        name: 'Basic select syntax (original issue)',
        query: 'user_data | select { name: name, age: age, email: email }'
    },
    {
        name: 'Select with || operator',
        query: 'user_data | select { name: name, safe_age: age || 0 }'
    },
    {
        name: 'Select with && operator', 
        query: 'user_data | select { name: name, is_adult: age && age >= 18 }'
    },
    {
        name: 'Select with both operators',
        query: 'user_data | select { full_name: (name && surname) ? name + " " + surname : name || "Unknown" }'
    }
];

for (const testCase of testCases) {
    console.log(`--- ${testCase.name} ---`);
    console.log(`Query: ${testCase.query}`);
    
    try {
        const result = transpileQuery(testCase.query);
        console.log('✅ Success! Transpiled to:');
        console.log(result.javascript);
        
        // Check for specific patterns
        if (testCase.name.includes('||') && result.javascript.includes('||')) {
            console.log('✅ || operator properly transpiled');
        }
        if (testCase.name.includes('&&') && result.javascript.includes('&&')) {
            console.log('✅ && operator properly transpiled');
        }
        if (result.javascript.includes('safeGet(item,')) {
            console.log('✅ Safe property access working');
        }
        
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
    
    console.log('');
}

console.log('All tests completed!');