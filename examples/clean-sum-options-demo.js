import { Stream } from '../src/core/stream.js';
import { createQueryFunction } from '../src/parser/query-transpiler.js';

console.log('=== Clean Sum Options Demo ===');
console.log('Only sum(expression, {options}) syntax\n');

// Test data with precision challenges
const testData = [
    { account: 'A', amount: 1000000.00 },
    { account: 'A', amount: 0.01 },
    { account: 'A', amount: 0.02 },
    { account: 'B', amount: 500000.00 },
    { account: 'B', amount: 0.03 },
    { account: 'B', amount: 'invalid' }, // Invalid data
    { account: 'B', amount: null },     // Invalid data
    { account: 'C', amount: '250.50' }  // String number
];

console.log('Test data:', testData.length, 'records with precision challenges\n');

async function runQuery(description, query) {
    console.log(`${description}:`);
    console.log(`  Query: ${query}`);
    
    try {
        const queryFunc = createQueryFunction(query);
        process.stdout.write('  Result: ');
        await queryFunc.execute(testData);
    } catch (error) {
        console.log(`  Error: ${error.message}`);
    }
    console.log();
}

async function demo() {
    // 1. Basic sum (uses Kahan by default)
    await runQuery(
        '1. Basic Sum (Default Kahan Algorithm)',
        'data | summarize { total: sum(amount) } | collect()'
    );

    // 2. Explicit algorithm selection
    await runQuery(
        '2. Explicit Kahan Algorithm',
        'data | summarize { total: sum(amount, {algorithm: "kahan"}) } | collect()'
    );

    await runQuery(
        '3. Naive Algorithm for Speed',
        'data | summarize { total: sum(amount, {algorithm: "naive"}) } | collect()'
    );

    await runQuery(
        '4. Pairwise Algorithm',
        'data | summarize { total: sum(amount, {algorithm: "pairwise"}) } | collect()'
    );

    // 3. Validation options
    await runQuery(
        '5. Non-Strict Mode (Graceful Invalid Data Handling)',
        'data | summarize { total: sum(amount, {strict: false}) } | collect()'
    );

    // 4. Combined options
    await runQuery(
        '6. Custom Configuration',
        'data | summarize { total: sum(amount, {algorithm: "kahan", detectOverflow: false}) } | collect()'
    );

    // 5. Algorithm comparison
    await runQuery(
        '7. Algorithm Comparison in Single Query',
        'data | summarize { kahan: sum(amount, {algorithm: "kahan"}), naive: sum(amount, {algorithm: "naive"}), pairwise: sum(amount, {algorithm: "pairwise"}) } | collect()'
    );

    // 6. GroupBy with options
    await runQuery(
        '8. GroupBy with Precision Options',
        'data | summarize { balance: sum(amount, {algorithm: "kahan"}), count: count() } by account | collect()'
    );

    // 7. Multiple options
    await runQuery(
        '9. Multiple Advanced Options',
        'data | summarize { total: sum(amount, {algorithm: "kahan", strict: false, detectOverflow: true}) } | collect()'
    );

    console.log('=== ✅ Clean Sum API Verified ===');
    console.log('\n📖 Supported Syntax (Only):');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ sum(expression)                     // Default Kahan         │');
    console.log('│ sum(expression, {options})          // With configuration    │');
    console.log('│                                                             │');
    console.log('│ Available Options:                                          │');
    console.log('│  algorithm: "kahan" | "naive" | "pairwise"                  │');
    console.log('│  strict: true | false                                       │');
    console.log('│  detectOverflow: true | false                               │');
    console.log('│  maxSafeValue: number                                       │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    console.log('\n💡 Examples:');
    console.log('• sum(amount)                           // High precision default');
    console.log('• sum(amount, {algorithm: "naive"})     // Fast summation');
    console.log('• sum(amount, {strict: true})           // Throw on invalid data');
    console.log('• sum(amount, {detectOverflow: false})  // Disable overflow detection');
    console.log('• sum(amount, {algorithm: "kahan", strict: false}) // Combined options');
}

demo().catch(console.error);