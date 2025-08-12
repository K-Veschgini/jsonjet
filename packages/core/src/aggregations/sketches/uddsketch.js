import { SparseBucketStore } from './sparse-bucket-store.js';

/**
 * UDDSketch - Minimal implementation for quantile estimation
 */
export class UDDSketch {
    constructor(maxBuckets = 1024) {
        if (typeof maxBuckets !== 'number' || !Number.isFinite(maxBuckets) || maxBuckets <= 0) {
            throw new Error('UDDSketch: maxBuckets must be a positive finite number');
        }
        this.maxBuckets = Math.floor(maxBuckets);
        // Start with conservative alpha that will increase on collapses
        this.alpha = 0.005;
        this.gamma = (1 + this.alpha) / (1 - this.alpha);
        this.logGamma = Math.log(this.gamma);
        this.minValue = 1e-9;

        this.positiveBuckets = new SparseBucketStore();
        this.negativeBuckets = new SparseBucketStore();
        this.zeroCount = 0;
        this.count = 0;
        this.min = Number.POSITIVE_INFINITY;
        this.max = Number.NEGATIVE_INFINITY;
    }

    _getBucketIndex(value) {
        return Math.ceil(Math.log(value / this.minValue) / this.logGamma);
    }

    _getBucketValue(index) {
        return this.minValue * Math.pow(this.gamma, index - 0.5);
    }

    add(value) {
        if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
            throw new Error('Value must be a finite number');
        }
        this.count++;
        this.min = Math.min(this.min, value);
        this.max = Math.max(this.max, value);
        if (value === 0) {
            this.zeroCount++;
        } else if (value > 0) {
            const index = this._getBucketIndex(value);
            this.positiveBuckets.add(index);
            this.#maybeUniformCollapse();
        } else {
            const index = this._getBucketIndex(-value);
            this.negativeBuckets.add(index);
            this.#maybeUniformCollapse();
        }
    }

    // Collapse helper: remap i -> ceil(i/2) and rebuild store using public API
    #uniformReindexStore(store) {
        const indices = store.getIndices();
        if (indices.length === 0) return;
        const remapped = new Map();
        for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            const count = store.get(idx);
            const j = Math.ceil(idx / 2);
            remapped.set(j, (remapped.get(j) || 0) + count);
        }
        // Rebuild using public methods
        store.clear();
        for (const [j, c] of remapped.entries()) {
            store.add(j, c);
        }
    }

    // Perform uniform collapse on both sides and update alpha/gamma per UDDSketch
    #uniformCollapseBothSides() {
        this.#uniformReindexStore(this.positiveBuckets);
        this.#uniformReindexStore(this.negativeBuckets);
        // alpha' = 2a/(1+a^2), gamma' = (1+alpha')/(1-alpha')
        const a = this.alpha;
        this.alpha = (2 * a) / (1 + a * a);
        this.gamma = (1 + this.alpha) / (1 - this.alpha);
        this.logGamma = Math.log(this.gamma);
    }

    // Ensure both sides are within budget; collapse repeatedly if needed
    #maybeUniformCollapse() {
        const pos = this.positiveBuckets.getIndices().length;
        const neg = this.negativeBuckets.getIndices().length;
        if (pos > this.maxBuckets || neg > this.maxBuckets) {
            this.#uniformCollapseBothSides();
            // Rare case: still too many distinct indices; repeat
            const pos2 = this.positiveBuckets.getIndices().length;
            const neg2 = this.negativeBuckets.getIndices().length;
            if (pos2 > this.maxBuckets || neg2 > this.maxBuckets) {
                // Loop conservatively to avoid deep recursion
                while (this.positiveBuckets.getIndices().length > this.maxBuckets ||
                       this.negativeBuckets.getIndices().length > this.maxBuckets) {
                    this.#uniformCollapseBothSides();
                }
            }
        }
    }

    reset() {
        this.positiveBuckets.clear();
        this.negativeBuckets.clear();
        this.zeroCount = 0;
        this.count = 0;
        this.min = Number.POSITIVE_INFINITY;
        this.max = Number.NEGATIVE_INFINITY;
    }

    export() {
        const negative = this.negativeBuckets
            .getIndices()
            .sort((a, b) => b - a)
            .map(idx => [idx, this.negativeBuckets.get(idx)]);
        const positive = this.positiveBuckets
            .getIndices()
            .sort((a, b) => a - b)
            .map(idx => [idx, this.positiveBuckets.get(idx)]);

        return {
            kind: 'uddsketch:v1',
            alpha: this.alpha,
            gamma: this.gamma,
            minValue: this.minValue,
            count: this.count,
            zeroCount: this.zeroCount,
            min: this.min,
            max: this.max,
            buckets: {
                negative,
                positive
            }
        };
    }

    /**
     * Compute quantile directly from an exported sketch JSON (no instance required)
     */
    static computeQuantileFromExport(exportedSketch, q) {
        if (!exportedSketch || typeof exportedSketch !== 'object' || exportedSketch.kind !== 'uddsketch:v1') {
            throw new Error('UDDSketch.computeQuantileFromExport: unsupported or invalid sketch; expected kind "uddsketch:v1"');
        }
        if (typeof q !== 'number' || !Number.isFinite(q) || q < 0 || q > 1) {
            throw new Error('UDDSketch.computeQuantileFromExport: q must be a finite number in [0,1]');
        }

        const { count, zeroCount, min, max, minValue, gamma, buckets } = exportedSketch;
        if (!Number.isInteger(count) || count < 0) {
            throw new Error('UDDSketch.computeQuantileFromExport: invalid sketch.count');
        }
        if (count === 0) return NaN;
        if (q === 0) return min;
        if (q === 1) return max;

        const targetRank = q * (count - 1);
        let currentRank = 0;

        const negative = (buckets && Array.isArray(buckets.negative)) ? buckets.negative : [];
        for (let i = 0; i < negative.length; i++) {
            const entry = negative[i];
            if (!Array.isArray(entry) || entry.length !== 2) continue;
            const [index, bucketCount] = entry;
            if (!Number.isInteger(index) || !Number.isInteger(bucketCount) || bucketCount <= 0) continue;
            if (currentRank + bucketCount > targetRank) {
                return -minValue * Math.pow(gamma, index - 0.5);
            }
            currentRank += bucketCount;
        }

        if (currentRank + zeroCount > targetRank) {
            return 0;
        }
        currentRank += zeroCount;

        const positive = (buckets && Array.isArray(buckets.positive)) ? buckets.positive : [];
        for (let i = 0; i < positive.length; i++) {
            const entry = positive[i];
            if (!Array.isArray(entry) || entry.length !== 2) continue;
            const [index, bucketCount] = entry;
            if (!Number.isInteger(index) || !Number.isInteger(bucketCount) || bucketCount <= 0) continue;
            if (currentRank + bucketCount > targetRank) {
                return minValue * Math.pow(gamma, index - 0.5);
            }
            currentRank += bucketCount;
        }

        return max;
    }

    /**
     * Get relative error bound for a sketch. For UDDSketch, this is alpha.
     * Note: if the sketch has undergone uniform collapses, the effective alpha
     * will be larger than the initial alpha.
     */
    static getRelativeError(exportedSketch) {
        if (!exportedSketch || typeof exportedSketch !== 'object' || exportedSketch.kind !== 'uddsketch:v1') {
            throw new Error('UDDSketch.getRelativeError: unsupported or invalid sketch; expected kind "uddsketch:v1"');
        }
        return exportedSketch.alpha;
    }

    /**
     * Compute CDF(x) = P(X <= x) from exported sketch
     */
    static computeCdfFromExport(exportedSketch, x) {
        if (!exportedSketch || typeof exportedSketch !== 'object' || exportedSketch.kind !== 'uddsketch:v1') {
            throw new Error('UDDSketch.computeCdfFromExport: unsupported or invalid sketch; expected kind "uddsketch:v1"');
        }
        if (typeof x !== 'number' || !Number.isFinite(x)) {
            throw new Error('UDDSketch.computeCdfFromExport: x must be a finite number');
        }
        const { count, zeroCount, min, max, minValue, gamma, buckets } = exportedSketch;
        if (!Number.isInteger(count) || count < 0) {
            throw new Error('UDDSketch.computeCdfFromExport: invalid sketch.count');
        }
        if (count === 0) return NaN;
        if (x <= min) return 0;
        if (x >= max) return 1;

        const bucketValue = (index) => minValue * Math.pow(gamma, index - 0.5);
        let cumulative = 0;

        // Negative buckets (values ascending)
        const negative = (buckets && Array.isArray(buckets.negative)) ? buckets.negative.slice().reverse() : [];
        for (const [index, w] of negative) {
            const value = -bucketValue(index);
            if (value <= x) {
                cumulative += w;
            } else {
                // still below x? continue until value <= x
                // since sequence is ascending, once value > x we can break
                break;
            }
        }

        // Zeros
        if (x >= 0) {
            cumulative += zeroCount;
        }

        // Positive buckets (values ascending)
        const positive = (buckets && Array.isArray(buckets.positive)) ? buckets.positive : [];
        for (const [index, w] of positive) {
            const value = bucketValue(index);
            if (value <= x) {
                cumulative += w;
            } else {
                break;
            }
        }

        return cumulative / count;
    }

    /**
     * Approximate rank index for value x based on CDF
     */
    static computeRankFromExport(exportedSketch, x) {
        const { count } = exportedSketch || {};
        if (!Number.isInteger(count) || count < 0) {
            throw new Error('UDDSketch.computeRankFromExport: invalid sketch.count');
        }
        const cdf = UDDSketch.computeCdfFromExport(exportedSketch, x);
        if (!Number.isFinite(cdf)) return NaN;
        return cdf * count;
    }

    /**
     * Estimate absolute CDF error at x: worst-case assumes all mass in x's bucket can lie either side
     * = bucket_count(x) / total_count
     */
    static getCdfErrorFromExport(exportedSketch, x) {
        if (!exportedSketch || typeof exportedSketch !== 'object' || exportedSketch.kind !== 'uddsketch:v1') {
            throw new Error('UDDSketch.getCdfErrorFromExport: unsupported or invalid sketch; expected kind "uddsketch:v1"');
        }
        if (typeof x !== 'number' || !Number.isFinite(x)) {
            throw new Error('UDDSketch.getCdfErrorFromExport: x must be a finite number');
        }
        const { count, minValue, gamma, buckets } = exportedSketch;
        if (!Number.isInteger(count) || count <= 0) return NaN;
        const idx = Math.ceil(Math.log(Math.abs(x) / minValue) / Math.log(gamma));
        let bucketCount = 0;
        if (x < 0) {
            const neg = (buckets && Array.isArray(buckets.negative)) ? buckets.negative : [];
            for (const [i, w] of neg) { if (i === idx) { bucketCount = w; break; } }
        } else if (x > 0) {
            const pos = (buckets && Array.isArray(buckets.positive)) ? buckets.positive : [];
            for (const [i, w] of pos) { if (i === idx) { bucketCount = w; break; } }
        } else {
            bucketCount = exportedSketch.zeroCount || 0;
        }
        return bucketCount / count;
    }
}


