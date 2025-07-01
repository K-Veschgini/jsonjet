import { createQueryFunction } from '../src/parser/query-transpiler.js';

console.log('=== Array Literal Syntax Test ===\n');

// Test data with various array scenarios
const testData = [
    { id: 1, tags: ['javascript', 'node'], scores: [85, 92, 78] },
    { id: 2, tags: ['python', 'data'], scores: [91, 88, 95] },
    { id: 3, tags: ['rust', 'systems'], scores: [76, 83, 89] }
];

async function testArraySyntax() {
    console.log('📋 Test Data:');
    testData.forEach(item => console.log(`   ${JSON.stringify(item)}`));
    console.log();

    // Test 1: Array literals in object properties
    console.log('1. Array literals in object properties:');
    await runQuery(
        'data | project {id: id, newTags: ["updated", "modern"]} | collect()'
    );

    // Test 2: Nested arrays in objects
    console.log('\\n2. Nested arrays in objects:');
    await runQuery(
        'data | project {id: id, matrix: [[1, 2], [3, 4]]} | collect()'
    );

    // Test 3: Arrays with mixed types
    console.log('\\n3. Arrays with mixed types:');
    await runQuery(
        'data | project {id: id, mixed: [1, "text", true, null]} | collect()'
    );

    // Test 4: Arrays in summarize expressions
    console.log('\\n4. Arrays in summarize expressions:');
    await runQuery(
        'data | summarize { ids: [1, 2, 3], total_count: count() } | collect()'
    );

    // Test 5: Arrays in sum function options
    console.log('\\n5. Arrays in function options:');
    await runQuery(
        'data | summarize { total: sum(id, {extra: [1, 2, 3]}) } | collect()'
    );

    // Test 6: Empty arrays
    console.log('\\n6. Empty arrays:');
    await runQuery(
        'data | project {id: id, empty: []} | collect()'
    );

    // Test 7: Arrays in where conditions
    console.log('\\n7. Arrays in expressions:');
    await runQuery(
        'data | where [1, 2, 3][0] == 1 | project id | collect()'
    );

    // Test 8: Complex nested structure
    console.log('\\n8. Complex nested structure:');
    await runQuery(
        'data | project {id: id, complex: {arr: [1, 2], nested: {inner: ["a", "b"]}}} | collect()'
    );

    console.log('\\n=== ✅ Array Syntax Test Complete ===');
    console.log('\\n📚 Supported Array Contexts:');
    console.log('• Object property values: {key: [1, 2, 3]}');
    console.log('• Function arguments: sum(field, {options: [1, 2]})');
    console.log('• Nested arrays: [[1, 2], [3, 4]]');
    console.log('• Mixed type arrays: [1, "text", true, null]');
    console.log('• Empty arrays: []');
    console.log('• Expression contexts: [1, 2, 3][0]');
    console.log('• Complex nesting: {obj: {arr: [1, 2]}}');
}

async function runQuery(query) {
    console.log(`   Query: ${query}`);
    try {
        const queryFunc = createQueryFunction(query);
        process.stdout.write('   Result: ');
        await queryFunc.execute(testData);
    } catch (error) {
        console.log(`   Error: ${error.message}`);
    }
}

testArraySyntax().catch(console.error);