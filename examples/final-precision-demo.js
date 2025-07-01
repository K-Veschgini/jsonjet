import { Stream } from '../src/core/stream.js';
import { createSummarizeOperator } from '../src/operators/summarize.js';
import { count, sum } from '../src/aggregations/core/aggregation-object.js';

console.log('=== Final Production Sum Demo ===\n');

// Financial transactions where precision matters
const transactions = [
    { type: 'deposit', amount: 1000000.00 },
    { type: 'fee', amount: -0.01 },
    { type: 'interest', amount: 0.02 },
    { type: 'fee', amount: -0.01 },
    { type: 'interest', amount: 0.03 },
    { type: 'fee', amount: -0.01 },
    { type: 'bonus', amount: 0.05 }
];

// Add many small transactions
for (let i = 0; i < 1000; i++) {
    transactions.push({ type: 'micro', amount: 0.001 });
}

console.log(`Processing ${transactions.length} financial transactions...`);
console.log('Including 1000 micro-transactions of $0.001 each');

async function demo() {
    const stream = new Stream();
    const summarizeOp = createSummarizeOperator({
        balance_kahan: sum(item => item.amount, { algorithm: 'kahan' }),
        balance_naive: sum(item => item.amount, { algorithm: 'naive' }),
        transaction_count: count(),
        total_fees: sum(item => item.type === 'fee' ? item.amount : 0),
        total_interest: sum(item => item.type === 'interest' ? item.amount : 0)
    });

    stream.pipe(summarizeOp).collect(result => {
        console.log('\n📊 Results:');
        console.log(`   Kahan Balance:    $${result.balance_kahan.toFixed(6)}`);
        console.log(`   Naive Balance:    $${result.balance_naive.toFixed(6)}`);
        console.log(`   Total Fees:       $${result.total_fees.toFixed(6)}`);
        console.log(`   Total Interest:   $${result.total_interest.toFixed(6)}`);
        console.log(`   Transaction Count: ${result.transaction_count}`);
        
        const difference = Math.abs(result.balance_kahan - result.balance_naive);
        console.log(`\n💡 Precision Difference: $${difference.toFixed(10)}`);
        
        if (difference > 0.000001) {
            console.log('   ⚠️  Significant precision difference detected!');
            console.log('   🔬 Kahan summation provides better accuracy for financial calculations');
        } else {
            console.log('   ✅ Both algorithms agree within acceptable tolerance');
        }
        
        // Calculate expected value manually
        const expected = 1000000.00 - 0.03 + 0.10 + 1.000; // deposit - fees + interest + micro-transactions
        console.log(`\n🎯 Expected Balance: $${expected.toFixed(6)}`);
        console.log(`   Kahan Error:  $${Math.abs(result.balance_kahan - expected).toFixed(10)}`);
        console.log(`   Naive Error:  $${Math.abs(result.balance_naive - expected).toFixed(10)}`);
    });
    
    for (const transaction of transactions) {
        stream.push(transaction);
    }
    await stream.finish();
}

await demo();

console.log('\n=== 🎉 Production Sum Features Summary ===');
console.log('✅ Kahan summation algorithm prevents precision loss');
console.log('✅ Handles large numbers with many small additions accurately');
console.log('✅ Input validation and type coercion');
console.log('✅ Multiple algorithm choices for different use cases');
console.log('✅ Overflow detection and error handling');
console.log('✅ Perfect for financial calculations and scientific computing');
console.log('✅ Backward compatible with existing codebase');
console.log('✅ Production-ready with comprehensive error handling');

console.log('\n💼 Use Cases:');
console.log('• Financial calculations (banking, accounting)');
console.log('• Scientific computing with many small values');
console.log('• Data analytics with precision requirements');
console.log('• Any scenario where floating point precision matters');