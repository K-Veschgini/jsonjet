import { Stream } from '../../src/core/stream.js';
import { ScanOperator } from '../../src/operators/scan.js';

async function main() {
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

    const scanner = new ScanOperator()
        .addStep('inSession',
            (state, row) => true,
            (state, row) => {
                state.inSession.sessionStart = state.inSession.sessionStart === null || state.inSession.sessionStart === undefined ? row.Ts : state.inSession.sessionStart;
                return {
                    sessionStart: state.inSession.sessionStart, 
                    session_id: state.matchId
                };
            }
        )
        .addStep('endSession', 
            (state, row) => row.Ts - state.inSession.sessionStart > 30
        );

    const pipeline = new Stream()
        .pipe(scanner)
        .collect(result => console.log(JSON.stringify(result)));

    Events.forEach(row => pipeline.push(row));
    
    // Wait for all processing to complete
    await pipeline.finish();
    console.log('✅ All processing complete!');
}

main().catch(console.error); 