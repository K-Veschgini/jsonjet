import { transpileQuery, validateQuery, getTranspilationInfo } from './src/parser/transpiler/index.js';

console.log('=== TESTING NEW TRANSPILER ARCHITECTURE ===\n');

// Test cases from the original select demo
const testCases = [
    {
        name: 'Basic select syntax',
        query: 'user_data | select { name: name, age: age, email: email }'
    },
    {
        name: 'Select with logical operators',
        query: 'user_data | select { safe_age: age || 0, is_verified: active && verified }'
    },
    {
        name: 'Complex where clause',
        query: 'users | where (age >= 18 && status == "active") || role == "admin"'
    },
    {
        name: 'Summarize with aggregation',
        query: 'sales | summarize { count: count(), total: sum(amount) } by product'
    }
];

console.log('1. Testing basic functionality...\n');

for (const testCase of testCases) {
    console.log(`--- ${testCase.name} ---`);
    console.log(`Query: ${testCase.query}`);
    
    try {
        // Test validation
        const validation = validateQuery(testCase.query);
        console.log(`✅ Validation: ${validation.valid ? 'PASS' : 'FAIL'}`);
        
        if (!validation.valid) {
            console.log('Parse errors:', validation.parseErrors.map(e => e.message));
            continue;
        }
        
        // Test transpilation
        const result = transpileQuery(testCase.query);
        console.log('✅ Transpilation: SUCCESS');
        console.log('Generated JS:', result.javascript);
        
        // Test if JavaScript is syntactically valid
        try {
            new Function('item', 'safeGet', 'Operators', result.javascript);
            console.log('✅ JavaScript syntax: VALID');
        } catch (jsError) {
            console.log('❌ JavaScript syntax: INVALID -', jsError.message);
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    console.log('');
}

console.log('2. Testing API features...\n');

const complexQuery = 'users | where age >= 18 && active | select { name: name, safe_score: score || 0 }';

try {
    // Test detailed info
    const info = getTranspilationInfo(complexQuery);
    console.log('Transpilation Info:');
    console.log(`- Success: ${info.success}`);
    console.log(`- Token count: ${info.input?.tokenCount}`);
    console.log(`- Complexity: ${info.output?.estimatedComplexity}`);
    console.log(`- CST nodes: ${info.parsing?.cstNodeCount}`);
    console.log(`- Version: ${info.metadata?.transpilerVersion}`);
    
} catch (error) {
    console.log('❌ API Error:', error.message);
}

console.log('\n=== NEW TRANSPILER TEST COMPLETE ===');