import { Stream } from '../../lib/lib/src/core/stream.js';
import { ScanOperator } from '../../lib/lib/src/operators/scan.js';

async function main() {
    const data = [1, 2, 3, 4, 5].map(x => ({x}));

    const scanner = new ScanOperator()
        .addStep('cumSum', 
            (state, row) => true,
            (state, row) => {
                if (!state.cumSum.cumulative_x) {
                    state.cumSum.cumulative_x = 0;
                }
                state.cumSum.cumulative_x += row.x;
                return {
                    cumulative_x: state.cumSum.cumulative_x,
                    matchId: state.matchId
                };
            }
        );

    const pipeline = new Stream()
        .pipe(scanner)
        .collect(result => console.log(result));

    data.forEach(row => pipeline.push(row));
    
    // Wait for all processing to complete
    await pipeline.finish();
    console.log('✅ All processing complete!');
}

main().catch(console.error); 