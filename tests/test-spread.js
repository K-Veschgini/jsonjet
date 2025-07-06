import { transpileQuery, createQueryFunction } from './src/parser/query-transpiler.js';

console.log('Testing spread syntax...');

// Test spread syntax
const query1 = 'users | scan(step s1: true => s1.base = {id: 1, type: "user"}; step s2: true => emit({...s1.base, name, age});)';
console.log('Query (spread):', query1);
try {
    const result1 = transpileQuery(query1);
    console.log('✅ Generated JS:');
    console.log(result1.javascript);
} catch (e) {
    console.log('❌ Error:', e.message);
}

// Test execution with spread
console.log('\n--- EXECUTION TEST ---');
const users = [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
];

const query2 = 'users | scan(step s1: true => s1.base = {status: "active", type: "user"}; step s2: true => emit({...s1.base, name, age});) | collect()';
console.log('\nQuery (execution with spread):', query2);
try {
    const queryFunc = createQueryFunction(query2);
    console.log('Generated JS:');
    console.log(queryFunc.javascript);
    console.log('\nExecuting...');
    await queryFunc.execute(users);
} catch (e) {
    console.log('❌ Error:', e.message);
} 