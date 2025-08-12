import { ScalarFunction } from '../core/scalar-function.js';
import { UDDSketch } from '../../aggregations/sketches/uddsketch.js';
import { TDigest } from '../../aggregations/sketches/tdigest.js';

export class CdfFunction extends ScalarFunction {
    constructor() {
        super('cdf');
    }

    _execute(args) {
        if (!Array.isArray(args) || args.length !== 2) {
            throw new Error('cdf(sketch, x) requires exactly 2 arguments');
        }
        const [sketch, x] = args;
        if (!sketch || typeof sketch !== 'object' || typeof sketch.kind !== 'string') {
            throw new Error('cdf: invalid sketch argument');
        }
        if (typeof x !== 'number' || !Number.isFinite(x)) {
            throw new Error('cdf: x must be a finite number');
        }
        const kind = sketch.kind;
        if (kind === 'uddsketch:v1') {
            return UDDSketch.computeCdfFromExport(sketch, x);
        } else if (kind === 'tdigest:v1') {
            return TDigest.computeCdfFromExport(sketch, x);
        }
        throw new Error(`cdf: unsupported sketch kind '${kind}'`);
    }
}


