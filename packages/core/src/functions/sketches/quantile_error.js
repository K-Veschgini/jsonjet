import { ScalarFunction } from '../core/scalar-function.js';
import { UDDSketch } from '../../aggregations/sketches/uddsketch.js';
import { TDigest } from '../../aggregations/sketches/tdigest.js';

/**
 * quantile_error(sketch, q) -> maximum relative error at quantile q
 * - sketch: JSON produced by UDDSketchAggregation or TDigestAggregation
 * - q: number in [0,1]
 * 
 * Returns the maximum relative error for the given quantile:
 * - For UDDSketch: alpha (constant across all quantiles)
 * - For TDigest: varies with q(1-q), higher accuracy near median
 */
export class QuantileErrorFunction extends ScalarFunction {
    constructor() {
        super('quantile_error');
    }

    _execute(args) {
        if (!Array.isArray(args) || args.length !== 2) {
            throw new Error('quantile_error(sketch, q) requires exactly 2 arguments');
        }
        const [sketch, q] = args;

        if (!sketch || typeof sketch !== 'object' || typeof sketch.kind !== 'string') {
            throw new Error('quantile_error: invalid sketch argument');
        }

        if (typeof q !== 'number' || !Number.isFinite(q) || q < 0 || q > 1) {
            throw new Error('quantile_error: q must be a finite number in [0,1]');
        }

        const kind = sketch.kind;
        if (kind === 'uddsketch:v1') {
            return UDDSketch.getRelativeError(sketch);
        } else if (kind === 'tdigest:v1') {
            return TDigest.getRelativeError(sketch, q);
        }
        throw new Error(`quantile_error: unsupported sketch kind '${kind}'`);
    }
}
