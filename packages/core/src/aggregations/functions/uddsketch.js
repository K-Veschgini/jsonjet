import { Aggregation } from '../core/aggregation.js';
import { UDDSketch } from '../sketches/uddsketch.js';

/**
 * UDDSketchAggregation - Aggregation wrapper around UDDSketch
 *
 * Usage in summarize:
 *   | summarize { a: uddsketch(b) }
 * Result shape: a plain serializable object representing the sketch.
 * Options: { maxBuckets?: number } (default 1024)
 */
export class UDDSketchAggregation extends Aggregation {
    constructor(options = {}) {
        super();
        const maxBuckets = options.maxBuckets ?? 1024;
        this.maxBuckets = maxBuckets;
        this.sketch = new UDDSketch(maxBuckets);
    }

    /**
     * Push a value into the sketch. Best-effort numeric coercion; non-numeric values are ignored.
     * @param {*} value
     */
    push(value) {
        const num = this.#coerceToNumber(value);
        if (num === null) return;
        // UDDSketch expects finite numbers only; it will throw otherwise
        this.sketch.add(num);
    }

    getResult() {
        return this.sketch.export();
    }

    reset() {
        this.sketch = new UDDSketch(this.maxBuckets);
    }

    clone() {
        return new UDDSketchAggregation({ maxBuckets: this.maxBuckets });
    }

    #coerceToNumber(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') {
            return isFinite(value) && !isNaN(value) ? value : null;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '') return null;
            const n = Number(trimmed);
            return isFinite(n) && !isNaN(n) ? n : null;
        }
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }
        // objects and other types are ignored
        return null;
    }
}


