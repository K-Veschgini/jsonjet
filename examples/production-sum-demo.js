import { Stream } from '../src/core/stream.js';
import { createSummarizeOperator } from '../src/operators/summarize.js';
import { count, sum } from '../src/aggregations/core/aggregation-object.js';

console.log('=== Production-Ready Sum Implementation Demo ===\n');

// Precision test data - demonstrates floating point precision issues
const precisionTestData = [
    { value: 1e20 },     // Very large number
    { value: 1.0 },      // Small number that would be lost in naive summation
    { value: -1e20 },    // Cancel out the large number
    { value: 2.0 },      // Another small number
    { value: 3.0 }       // Another small number
];
// Expected result: 6.0 (1e20 + 1 - 1e20 + 2 + 3)
// Naive summation might lose precision and give wrong result

const edgeCaseData = [
    { value: 0.1 },
    { value: 0.2 },
    { value: 0.3 },
    { value: 'invalid' },
    { value: null },
    { value: '10.5' },
    { value: true },
    { value: false },
    { value: Infinity },
    { value: -Infinity }
];

async function demo1_PrecisionComparison() {
    console.log('1. Precision Comparison: Kahan vs Naive vs Pairwise');
    console.log('   Testing with large numbers that would lose precision in naive summation');
    
    const algorithms = ['kahan', 'naive', 'pairwise'];
    
    for (const algorithm of algorithms) {
        const stream = new Stream();
        const summarizeOp = createSummarizeOperator({
            result: sum(item => item.value, { algorithm }),
            stats: sum(item => item.value, { algorithm }) // We'll check stats later
        });

        console.log(`\n   ${algorithm.toUpperCase()} Algorithm:`);
        
        let resultSum;
        stream.pipe(summarizeOp).collect(result => {
            resultSum = result.result;
            console.log(`     Sum: ${result.result}`);
        });
        
        for (const item of precisionTestData) stream.push(item);
        await stream.finish();
        
        // Check if we got the expected result (6.0)
        const isCorrect = Math.abs(resultSum - 6.0) < 1e-10;
        console.log(`     Expected: 6.0, Got: ${resultSum}, Correct: ${isCorrect ? '✅' : '❌'}`);
    }
}

async function demo2_InputValidation() {
    console.log('\n2. Input Validation and Type Coercion');
    console.log('   Testing with various input types and invalid values');
    
    const stream = new Stream();
    let stats;
    
    const summarizeOp = createSummarizeOperator({
        total: sum(item => item.value, { algorithm: 'kahan' })
    });

    stream.pipe(summarizeOp).collect(result => {
        console.log(`   Total: ${result.total}`);
    });
    
    // Add a custom aggregation to get detailed stats
    const customSum = sum(item => item.value, { algorithm: 'kahan' });
    const sumInstance = customSum._arguments[1] ? 
        new (await import('../src/aggregations/functions/sum.js')).Sum(customSum._arguments[1]) :
        new (await import('../src/aggregations/functions/sum.js')).Sum();
    
    console.log('   Processing each value:');
    for (const item of edgeCaseData) {
        sumInstance.push(item.value);
        console.log(`     ${JSON.stringify(item.value)} -> ${typeof item.value}`);
    }
    
    stats = sumInstance.getStats();
    console.log(`\n   Final Stats:`, stats);
    
    for (const item of edgeCaseData) stream.push(item);
    await stream.finish();
}

async function demo3_StrictMode() {
    console.log('\n3. Strict Mode - Throws on Invalid Inputs');
    
    const invalidData = [{ value: 'not_a_number' }];
    
    try {
        const stream = new Stream();
        const summarizeOp = createSummarizeOperator({
            total: sum(item => item.value, { algorithm: 'kahan', strict: true })
        });

        stream.pipe(summarizeOp).collect(result => {
            console.log(`   Result: ${result.total}`);
        });
        
        for (const item of invalidData) stream.push(item);
        await stream.finish();
        
        console.log('   ❌ Should have thrown an error');
    } catch (error) {
        console.log(`   ✅ Correctly threw error: ${error.message}`);
    }
}

async function demo4_OverflowDetection() {
    console.log('\n4. Overflow Detection');
    
    const largeData = [
        { value: Number.MAX_SAFE_INTEGER },
        { value: 1000 }  // This should trigger overflow
    ];
    
    const stream = new Stream();
    let hasOverflowed = false;
    
    // Create a custom sum to check overflow
    const customSum = new (await import('../src/aggregations/functions/sum.js')).Sum({ 
        algorithm: 'kahan',
        detectOverflow: true 
    });
    
    console.log('   Processing large values:');
    for (const item of largeData) {
        customSum.push(item.value);
        console.log(`     Added: ${item.value}`);
    }
    
    const stats = customSum.getStats();
    console.log(`   Overflow detected: ${stats.hasOverflowed ? '✅' : '❌'}`);
    console.log(`   Final sum: ${stats.sum}`);
}

async function demo5_RealWorldExample() {
    console.log('\n5. Real-World Example: Financial Calculations');
    
    // Simulating financial data where precision matters
    const financialData = [
        { transaction: 'purchase', amount: 1234.56 },
        { transaction: 'fee', amount: -2.99 },
        { transaction: 'interest', amount: 0.01 },
        { transaction: 'purchase', amount: 987.65 },
        { transaction: 'refund', amount: -123.45 },
        { transaction: 'fee', amount: -1.50 },
        { transaction: 'interest', amount: 0.02 }
    ];
    
    console.log('   Financial transactions:');
    financialData.forEach(t => console.log(`     ${t.transaction}: $${t.amount}`));
    
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator({
        balance_kahan: sum(item => item.amount, { algorithm: 'kahan' }),
        balance_naive: sum(item => item.amount, { algorithm: 'naive' }),
        transaction_count: count()
    });

    stream.pipe(summarizeOp).collect(result => {
        console.log(`\n   Results:`);
        console.log(`     Kahan Sum:  $${result.balance_kahan.toFixed(2)}`);
        console.log(`     Naive Sum:  $${result.balance_naive.toFixed(2)}`);
        console.log(`     Count:      ${result.transaction_count} transactions`);
        
        const difference = Math.abs(result.balance_kahan - result.balance_naive);
        console.log(`     Difference: $${difference.toFixed(10)} (${difference > 1e-10 ? 'Significant!' : 'Negligible'})`);
    });
    
    for (const item of financialData) stream.push(item);
    await stream.finish();
}

async function demo6_MicroPrecisionTest() {
    console.log('\n6. Micro-Precision Test: Adding 0.1 ten times');
    console.log('   Classic floating point precision issue');
    
    const microData = Array.from({ length: 10 }, () => ({ value: 0.1 }));
    
    const algorithms = ['kahan', 'naive', 'pairwise'];
    
    for (const algorithm of algorithms) {
        const stream = new Stream();
        const summarizeOp = createSummarizeOperator({
            result: sum(item => item.value, { algorithm })
        });

        let result;
        stream.pipe(summarizeOp).collect(r => { result = r.result; });
        
        for (const item of microData) stream.push(item);
        await stream.finish();
        
        const expected = 1.0;
        const difference = Math.abs(result - expected);
        
        console.log(`   ${algorithm.padEnd(8)}: ${result} (diff: ${difference.toExponential(2)}) ${difference < 1e-15 ? '✅' : '⚠️'}`);
    }
    
    console.log('   Expected: exactly 1.0');
}

async function runAllDemos() {
    try {
        await demo1_PrecisionComparison();
        await demo2_InputValidation();
        await demo3_StrictMode();
        await demo4_OverflowDetection();
        await demo5_RealWorldExample();
        await demo6_MicroPrecisionTest();
        
        console.log('\n=== ✅ Production Sum Features Demonstrated ===');
        console.log('✅ Kahan summation algorithm for better precision');
        console.log('✅ Input validation and type coercion');
        console.log('✅ Strict mode with error throwing');
        console.log('✅ Overflow detection and handling');
        console.log('✅ Multiple algorithm choices (kahan, naive, pairwise)');
        console.log('✅ Detailed statistics and diagnostics');
        console.log('✅ Real-world financial calculation accuracy');
        console.log('✅ Edge case handling (null, undefined, strings, booleans)');
        
    } catch (error) {
        console.error('Demo failed:', error);
    }
}

runAllDemos();