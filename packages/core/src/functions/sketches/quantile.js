import { ScalarFunction } from '../core/scalar-function.js';
import { UDDSketch } from '../../aggregations/sketches/uddsketch.js';
import { TDigest } from '../../aggregations/sketches/tdigest.js';

/**
 * quantile(sketch, q) -> approximate quantile
 * - sketch: JSON produced by UDDSketchAggregation.getResult() with kind 'uddsketch:v1'
 * - q: number in [0,1]
 */
export class QuantileFunction extends ScalarFunction {
    constructor() {
        super('quantile');
    }

    _execute(args) {
        if (!Array.isArray(args) || args.length !== 2) {
            throw new Error('quantile(sketch, q) requires exactly 2 arguments');
        }
        const [sketch, q] = args;

        if (!sketch || typeof sketch !== 'object' || typeof sketch.kind !== 'string') {
            throw new Error('quantile: invalid sketch argument');
        }

        if (typeof q !== 'number' || !Number.isFinite(q)) {
            throw new Error('quantile: q must be a finite number in [0,1]');
        }
        const kind = sketch.kind;
        if (kind === 'uddsketch:v1') {
            return UDDSketch.computeQuantileFromExport(sketch, q);
        } else if (kind === 'tdigest:v1') {
            return TDigest.computeQuantileFromExport(sketch, q);
        }
        throw new Error(`quantile: unsupported sketch kind '${kind}'`);
    }
}


