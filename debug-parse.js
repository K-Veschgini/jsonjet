import { transpileQuery } from './src/parser/query-transpiler.js';

console.log('Debugging parsing issue...');

// Test simple case
const query1 = 'data | scan(step s1: true => emit({x: 1});)';
console.log('Test 1:', query1);
try {
    const result = transpileQuery(query1);
    console.log('✅ Success');
} catch (e) {
    console.log('❌ Error:', e.message);
}

// Test with multiple properties
const query2 = 'data | scan(step s1: true => emit({x: 1, y: 2});)';
console.log('\nTest 2:', query2);
try {
    const result = transpileQuery(query2);
    console.log('✅ Success');
} catch (e) {
    console.log('❌ Error:', e.message);
}

// Test the problematic case with string values
const query3 = 'data | scan(step s1: true => emit({input: x, step: "cumSum"});)';
console.log('\nTest 3:', query3);
try {
    const result = transpileQuery(query3);
    console.log('✅ Success');
} catch (e) {
    console.log('❌ Error:', e.message);
}

// Test the exact query from the example (simplified)
const query4 = `data | scan(step cumSum: true => emit({input: x, step: "cumSum"});)`;
console.log('\nTest 4:', query4);
try {
    const result = transpileQuery(query4);
    console.log('✅ Success');
} catch (e) {
    console.log('❌ Error:', e.message);
}

// Test with complex example
const query5 = `
        data 
        | scan(
            step cumSum: true => 
                cumSum.cumulative_x = iff(cumSum.cumulative_x, cumSum.cumulative_x + x, x),
                emit({input: x, cumulative: cumSum.cumulative_x, step: "cumSum"});
        )
        | collect()
    `;
console.log('\nTest 5 (full example):', query5);
try {
    const result = transpileQuery(query5);
    console.log('✅ Success');
} catch (e) {
    console.log('❌ Error:', e.message);
} 