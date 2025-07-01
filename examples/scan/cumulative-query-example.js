import { createQueryFunction } from '../../src/parser/query-transpiler.js';

async function main() {
    // Sample data - simple cumulative sum example
    const data = [
        { x: 1 },
        { x: 2 },
        { x: 3 },
        { x: 4 },
        { x: 5 }
    ];

    // Define the query using object literals to emit rich results
    const query = `
        data 
        | scan(
            step cumSum: true => 
                cumSum.cumulative_x = iff(cumSum.cumulative_x, cumSum.cumulative_x + x, x),
                emit({input: x, cumulative: cumSum.cumulative_x});
        )
        | collect()
    `;

    console.log('=== Cumulative Sum Query Example (with Objects) ===\n');

    // Create the query function from our query language
    const queryResult = createQueryFunction(query);

    console.log('Original Query:');
    console.log(query);
    console.log('\nTranspiled JavaScript:');
    console.log(queryResult.javascript);

    // Execute the transpiled query - collect() will print results as they come
    console.log('\nInput data:', data);
    console.log('Expected output: Rich objects with input, cumulative sum, and metadata');
    console.log('\nExecuting transpiled query...');
    
    await queryResult.execute(data);
    
    console.log('\n✅ Query execution complete!');
    console.log('\nNote: Now emitting rich objects instead of simple values!');
}

main().catch(console.error); 