import { transpileQuery, createQueryFunction } from './src/parser/query-transpiler.js';

console.log('Testing object literal parsing...');

// Test basic object literal
const query1 = 'users | scan(step s1: true => emit({name: name, age: age});)';
console.log('Query 1 (basic object):', query1);
try {
    const result1 = transpileQuery(query1);
    console.log('✅ Generated JS:', result1.javascript);
} catch (e) {
    console.log('❌ Error:', e.message);
}

// Test shorthand syntax
const query2 = 'users | scan(step s1: true => emit({name, age});)';
console.log('\nQuery 2 (shorthand):', query2);
try {
    const result2 = transpileQuery(query2);
    console.log('✅ Generated JS:', result2.javascript);
} catch (e) {
    console.log('❌ Error:', e.message);
}

// Test with string keys
const query3 = 'users | scan(step s1: true => emit({"full-name": name, age});)';
console.log('\nQuery 3 (string keys):', query3);
try {
    const result3 = transpileQuery(query3);
    console.log('✅ Generated JS:', result3.javascript);
} catch (e) {
    console.log('❌ Error:', e.message);
}

// Test execution
console.log('\n--- EXECUTION TEST ---');
const users = [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
];

const query4 = 'users | scan(step s1: true => emit({name, age, status: "active"});) | collect()';
console.log('\nQuery 4 (execution):', query4);
try {
    const queryFunc = createQueryFunction(query4);
    console.log('Generated JS:', queryFunc.javascript);
    console.log('\nExecuting...');
    await queryFunc.execute(users);
} catch (e) {
    console.log('❌ Error:', e.message);
} 