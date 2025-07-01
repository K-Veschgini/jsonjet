import { Stream } from '../src/core/stream.js';
import { createQueryFunction } from '../src/parser/query-transpiler.js';

console.log('=== Final Clean Sum API Demo ===');
console.log('Simple and powerful: sum(expression, {options})\n');

// Real-world financial data
const transactions = [
    { account: 'savings', amount: 10000.00, fees: 0 },
    { account: 'savings', amount: 0.01, fees: 0.25 },     // Small interest
    { account: 'checking', amount: 5000.00, fees: 0 },
    { account: 'checking', amount: -50.00, fees: 2.50 },  // Withdrawal + fee
    { account: 'investment', amount: 25000.00, fees: 10.00 }
];

console.log('Financial transactions with precision requirements\n');

async function demo() {
    console.log('🎯 Basic Usage (Default High Precision):');
    await executeQuery(
        'data | summarize { total_balance: sum(amount) } | collect()'
    );

    console.log('\n⚡ Performance Mode (When Speed Matters):');
    await executeQuery(
        'data | summarize { total_balance: sum(amount, {algorithm: "naive"}) } | collect()'
    );

    console.log('\n🔬 Scientific Mode (Large Datasets):');
    await executeQuery(
        'data | summarize { total_balance: sum(amount, {algorithm: "pairwise"}) } | collect()'
    );

    console.log('\n🛡️ Strict Validation (Clean Data Only):');
    try {
        await executeQuery(
            'data | summarize { total_balance: sum(amount, {strict: true}) } | collect()'
        );
    } catch (error) {
        console.log(`   Result: ${error.message}`);
    }

    console.log('\n🔧 Custom Configuration:');
    await executeQuery(
        'data | summarize { total_balance: sum(amount, {algorithm: "kahan", detectOverflow: false}) } | collect()'
    );

    console.log('\n📊 Algorithm Comparison:');
    await executeQuery(
        'data | summarize { kahan: sum(amount, {algorithm: "kahan"}), naive: sum(amount, {algorithm: "naive"}), pairwise: sum(amount, {algorithm: "pairwise"}) } | collect()'
    );

    console.log('\n💰 Real-World Financial Analysis:');
    await executeQuery(
        'data | summarize { balance: sum(amount, {algorithm: "kahan"}), fees: sum(fees, {algorithm: "kahan"}), net: sum(amount - fees, {algorithm: "kahan"}) } by account | collect()'
    );

    console.log('\n=== ✅ Clean, Simple, Powerful ===');
    console.log('\n📚 Complete API:');
    console.log('┌────────────────────────────────────────────────────────┐');
    console.log('│ sum(expression)                 // High precision      │');
    console.log('│ sum(expression, {options})      // Configurable        │');
    console.log('│                                                        │');
    console.log('│ Options:                                               │');
    console.log('│  algorithm: "kahan" | "naive" | "pairwise"             │');
    console.log('│  strict: true | false                                  │');
    console.log('│  detectOverflow: true | false                          │');
    console.log('│  maxSafeValue: number                                  │');
    console.log('└────────────────────────────────────────────────────────┘');

    console.log('\n🎉 Benefits:');
    console.log('• High precision by default (Kahan algorithm)');
    console.log('• Configurable for different use cases');
    console.log('• Works in both programmatic and query language');
    console.log('• Production-ready with error handling');
    console.log('• Simple, clean API without clutter');
}

async function executeQuery(query) {
    console.log(`   Query: ${query}`);
    try {
        const queryFunc = createQueryFunction(query);
        process.stdout.write('   Result: ');
        await queryFunc.execute(transactions);
    } catch (error) {
        console.log(`   Error: ${error.message}`);
    }
}

demo().catch(console.error);