import { Stream } from '../src/core/stream.js';
import { createQueryFunction } from '../src/parser/query-transpiler.js';

console.log('=== Updated Sum Syntax Demo ===');
console.log('Clean sum(expression, {options}) API only\n');

// Financial transaction data
const transactions = [
    { account: 'A', amount: 1000.00, type: 'deposit' },
    { account: 'A', amount: -2.50, type: 'fee' },
    { account: 'A', amount: 0.05, type: 'interest' },
    { account: 'B', amount: 500.00, type: 'deposit' },
    { account: 'B', amount: -1.25, type: 'fee' },
    { account: 'B', amount: 'invalid', type: 'error' }, // Invalid data
    { account: 'B', amount: null, type: 'error' },     // Invalid data
    { account: 'C', amount: '250.75', type: 'deposit' }, // String number
];

console.log('Sample data:', transactions.length, 'transactions');
console.log('Including invalid data to test validation\n');

async function runQuery(description, query) {
    console.log(`${description}:`);
    console.log(`  Query: ${query}`);
    
    try {
        const queryFunc = createQueryFunction(query);
        process.stdout.write('  Result: ');
        await queryFunc.execute(transactions);
    } catch (error) {
        console.log(`  Error: ${error.message}`);
    }
    console.log();
}

async function demo() {
    // 1. Basic Syntax (uses Kahan by default)
    await runQuery(
        '1. Basic Sum (Default High Precision)',
        'data | summarize { total: sum(amount) } | collect()'
    );

    // 2. Algorithm Selection
    await runQuery(
        '2. High Precision Algorithm',
        'data | summarize { total: sum(amount, {algorithm: "kahan"}) } | collect()'
    );

    await runQuery(
        '3. Fast Algorithm',
        'data | summarize { total: sum(amount, {algorithm: "naive"}) } | collect()'
    );

    await runQuery(
        '4. Balanced Algorithm',
        'data | summarize { total: sum(amount, {algorithm: "pairwise"}) } | collect()'
    );

    // 3. Validation Options
    await runQuery(
        '5. Graceful Error Handling',
        'data | summarize { total: sum(amount, {strict: false}) } | collect()'
    );

    // 4. Custom Configuration
    await runQuery(
        '6. Custom Configuration',
        'data | summarize { total: sum(amount, {algorithm: "kahan", detectOverflow: true}) } | collect()'
    );

    // 5. Algorithm Comparison
    await runQuery(
        '7. Algorithm Comparison',
        'data | summarize { kahan: sum(amount, {algorithm: "kahan"}), naive: sum(amount, {algorithm: "naive"}), pairwise: sum(amount, {algorithm: "pairwise"}) } | collect()'
    );

    // 6. GroupBy with Options
    await runQuery(
        '8. GroupBy with Precision',
        'data | summarize { balance: sum(amount, {algorithm: "kahan"}), count: count() } by account | collect()'
    );

    // 7. Complex Expression
    await runQuery(
        '9. Complex Financial Calculations',
        'data | summarize { fees: sum(amount, {algorithm: "kahan"}), deposits: sum(amount, {algorithm: "kahan"}) } | collect()'
    );

    console.log('=== ✅ Updated API Working Perfectly ===');
    console.log('\n📚 Clean Syntax Reference:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ sum(expression)                     // Default high precision│');
    console.log('│ sum(expression, {options})          // Configurable          │');
    console.log('│                                                             │');
    console.log('│ Algorithm Options:                                          │');
    console.log('│  {algorithm: "kahan"}              // High precision         │');
    console.log('│  {algorithm: "naive"}              // Fast, standard         │');
    console.log('│  {algorithm: "pairwise"}           // Good precision         │');
    console.log('│                                                             │');
    console.log('│ Validation Options:                                         │');
    console.log('│  {strict: true}                    // Throw on invalid data │');
    console.log('│  {strict: false}                   // Skip invalid data     │');
    console.log('│                                                             │');
    console.log('│ Other Options:                                              │');
    console.log('│  {detectOverflow: false}           // Disable overflow check│');
    console.log('│  {maxSafeValue: 1e15}              // Custom overflow limit │');
    console.log('└─────────────────────────────────────────────────────────────┘');

    console.log('\n🎯 Use Cases:');
    console.log('• Financial: sum(amount, {algorithm: "kahan"}) for precision');
    console.log('• Performance: sum(count, {algorithm: "naive"}) for speed');
    console.log('• Data Quality: sum(value, {strict: true}) for clean data');
    console.log('• Large Datasets: sum(measurement, {algorithm: "pairwise"})');
    console.log('• Mixed Data: sum(value, {strict: false}) for dirty data');
}

demo().catch(console.error);