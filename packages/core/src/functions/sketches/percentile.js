import { ScalarFunction } from '../core/scalar-function.js';
import { UDDSketch } from '../../aggregations/sketches/uddsketch.js';
import { TDigest } from '../../aggregations/sketches/tdigest.js';

export class PercentileFunction extends ScalarFunction {
    constructor() {
        super('percentile');
    }

    _execute(args) {
        if (!Array.isArray(args) || args.length !== 2) {
            throw new Error('percentile(sketch, p) requires exactly 2 arguments');
        }
        const [sketch, p] = args;
        if (!sketch || typeof sketch !== 'object' || typeof sketch.kind !== 'string') {
            throw new Error('percentile: invalid sketch argument');
        }
        if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 100) {
            throw new Error('percentile: p must be a finite number in [0,100]');
        }
        const q = p / 100;
        const kind = sketch.kind;
        if (kind === 'uddsketch:v1') {
            return UDDSketch.computeQuantileFromExport(sketch, q);
        } else if (kind === 'tdigest:v1') {
            return TDigest.computeQuantileFromExport(sketch, q);
        }
        throw new Error(`percentile: unsupported sketch kind '${kind}'`);
    }
}


