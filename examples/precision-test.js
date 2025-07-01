import { Sum } from '../src/aggregations/functions/sum.js';

console.log('=== Floating Point Precision Test ===\n');

// Test 1: Classic precision loss scenario
console.log('1. Classic Precision Loss Test');
console.log('   Adding many small numbers to a large number');

const largeNumber = 1e15;
const smallNumbers = Array.from({ length: 1000 }, () => 0.1);

console.log(`   Large number: ${largeNumber}`);
console.log(`   Adding ${smallNumbers.length} small numbers of 0.1 each`);
console.log(`   Expected total: ${largeNumber + smallNumbers.length * 0.1}`);

// Test with different algorithms
const algorithms = ['naive', 'kahan', 'pairwise'];

algorithms.forEach(algorithm => {
    const sum = new Sum({ algorithm });
    
    // Add the large number first
    sum.push(largeNumber);
    
    // Add all the small numbers
    smallNumbers.forEach(num => sum.push(num));
    
    const result = sum.getResult();
    const expected = largeNumber + smallNumbers.length * 0.1;
    const error = Math.abs(result - expected);
    
    console.log(`   ${algorithm.padEnd(8)}: ${result} (error: ${error.toExponential(2)})`);
});

// Test 2: Repeated 0.1 addition
console.log('\n2. Repeated 0.1 Addition Test');
console.log('   Adding 0.1 exactly 10 times (should equal 1.0)');

algorithms.forEach(algorithm => {
    const sum = new Sum({ algorithm });
    
    for (let i = 0; i < 10; i++) {
        sum.push(0.1);
    }
    
    const result = sum.getResult();
    const expected = 1.0;
    const error = Math.abs(result - expected);
    
    console.log(`   ${algorithm.padEnd(8)}: ${result} (error: ${error.toExponential(2)}) ${error < 1e-15 ? '✅' : '⚠️'}`);
});

// Test 3: Catastrophic cancellation
console.log('\n3. Catastrophic Cancellation Test');
console.log('   Testing: (1e20 + 1) - 1e20 (should equal 1.0)');

algorithms.forEach(algorithm => {
    const sum = new Sum({ algorithm });
    
    sum.push(1e20);
    sum.push(1);
    sum.push(-1e20);
    
    const result = sum.getResult();
    const expected = 1.0;
    const error = Math.abs(result - expected);
    
    console.log(`   ${algorithm.padEnd(8)}: ${result} (error: ${error.toExponential(2)}) ${error < 1e-10 ? '✅' : '❌'}`);
});

// Test 4: Input validation
console.log('\n4. Input Validation Test');

const sum = new Sum({ algorithm: 'kahan' });

const testInputs = [
    1.5,          // normal number
    '2.5',        // string number
    true,         // boolean
    false,        // boolean
    null,         // null
    undefined,    // undefined
    'invalid',    // invalid string
    NaN,          // NaN
    Infinity,     // Infinity
    -Infinity     // -Infinity
];

console.log('   Testing various input types:');
testInputs.forEach(input => {
    const beforeCount = sum.count;
    sum.push(input);
    const afterCount = sum.count;
    const wasProcessed = afterCount > beforeCount;
    
    console.log(`     ${JSON.stringify(input).padEnd(12)} (${typeof input}) -> ${wasProcessed ? 'processed' : 'skipped'}`);
});

const stats = sum.getStats();
console.log(`\n   Final stats: ${stats.count} processed, ${stats.invalidInputCount} invalid`);
console.log(`   Final sum: ${stats.sum}`);

console.log('\n=== Precision Test Complete ===');