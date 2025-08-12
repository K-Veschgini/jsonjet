import { ScalarFunction } from '../core/scalar-function.js';
import { UDDSketch } from '../../aggregations/sketches/uddsketch.js';
import { TDigest } from '../../aggregations/sketches/tdigest.js';

export class CdfErrorFunction extends ScalarFunction {
    constructor() {
        super('cdf_error');
    }

    _execute(args) {
        if (!Array.isArray(args) || args.length !== 2) {
            throw new Error('cdf_error(sketch, x) requires exactly 2 arguments');
        }
        const [sketch, x] = args;
        if (!sketch || typeof sketch !== 'object' || typeof sketch.kind !== 'string') {
            throw new Error('cdf_error: invalid sketch argument');
        }
        if (typeof x !== 'number' || !Number.isFinite(x)) {
            throw new Error('cdf_error: x must be a finite number');
        }
        const kind = sketch.kind;
        if (kind === 'uddsketch:v1') {
            return UDDSketch.getCdfErrorFromExport(sketch, x);
        } else if (kind === 'tdigest:v1') {
            return TDigest.getCdfErrorFromExport(sketch, x);
        }
        throw new Error(`cdf_error: unsupported sketch kind '${kind}'`);
    }
}


