import { Aggregation } from '../core/aggregation.js';
import { TDigest } from '../sketches/tdigest.js';

export class TDigestAggregation extends Aggregation {
    constructor(options = {}) {
        super();
        const compression = options.compression ?? 100;
        this.compression = compression;
        this.digest = new TDigest(compression);
    }

    push(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return; // strict: ignore non-numbers
        this.digest.add(value);
    }

    getResult() {
        return this.digest.export();
    }

    reset() {
        this.digest = new TDigest(this.compression);
    }

    clone() {
        return new TDigestAggregation({ compression: this.compression });
    }
}


