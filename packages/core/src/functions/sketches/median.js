import { ScalarFunction } from '../core/scalar-function.js';
import { UDDSketch } from '../../aggregations/sketches/uddsketch.js';
import { TDigest } from '../../aggregations/sketches/tdigest.js';

export class MedianFunction extends ScalarFunction {
    constructor() {
        super('median');
    }

    _execute(args) {
        if (!Array.isArray(args) || args.length !== 1) {
            throw new Error('median(sketch) requires exactly 1 argument');
        }
        const [sketch] = args;
        if (!sketch || typeof sketch !== 'object' || typeof sketch.kind !== 'string') {
            throw new Error('median: invalid sketch argument');
        }
        const kind = sketch.kind;
        if (kind === 'uddsketch:v1') {
            return UDDSketch.computeQuantileFromExport(sketch, 0.5);
        } else if (kind === 'tdigest:v1') {
            return TDigest.computeQuantileFromExport(sketch, 0.5);
        }
        throw new Error(`median: unsupported sketch kind '${kind}'`);
    }
}


