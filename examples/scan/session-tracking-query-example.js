import { createQueryFunction } from '../../src/parser/query-transpiler.js';

async function main() {
    // Sample data - user session events
    const Events = [
        { Ts: 0, Event: "A" }, 
        { Ts: 1, Event: "A" }, 
        { Ts: 2, Event: "B" }, 
        { Ts: 3, Event: "D" },
        { Ts: 32, Event: "B" }, 
        { Ts: 36, Event: "C" }, 
        { Ts: 38, Event: "D" }, 
        { Ts: 41, Event: "E" }, 
        { Ts: 75, Event: "A" }
    ];

    // Define the query using object literals for rich session tracking output
    const query = `
        Events 
        | scan(
            step inSession: true => 
                inSession.sessionStart = iff(inSession.sessionStart, inSession.sessionStart, Ts),
                emit({
                    timestamp: Ts, 
                    event: Event, 
                    sessionStart: inSession.sessionStart, 
                    sessionDuration: Ts - inSession.sessionStart,
                    status: "active"
                });
            step endSession: Ts - inSession.sessionStart > 30 => 
                inSession.sessionStart = Ts;
        )
        | collect()
    `;

    console.log('=== Session Tracking Query Example (with Objects) ===\n');

    // Create the query function from our query language
    const queryResult = createQueryFunction(query);

    console.log('Original Query:');
    console.log(query);
    console.log('\nTranspiled JavaScript:');
    console.log(queryResult.javascript);

    // Execute the transpiled query - collect() will print results as they come
    console.log('\nInput data:', Events);
    console.log('Expected behavior: Rich objects with event details, session info, and duration tracking');
    console.log('\nExecuting transpiled query...');
    
    await queryResult.execute(Events);
    
    console.log('\n✅ Query execution complete!');
    console.log('\nNote: Now emitting rich session objects with metadata!');
    console.log('Objects include: timestamp, event, sessionStart, sessionDuration, and status');
}

main().catch(console.error); 