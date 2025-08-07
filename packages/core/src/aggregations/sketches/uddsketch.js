/**
 * UDDSketch - Minimal implementation for quantile estimation
 * 
 * A memory-efficient data structure for computing approximate
 * quantiles (percentiles, median) with bounded relative error.
 */

/**
 * Sparse bucket store for efficient memory usage
 */
class SparseBucketStore {
    constructor() {
        this.buckets = new Map(); // bucket_index -> count
        this.count = 0;
    }

    add(index, count = 1) {
        const current = this.buckets.get(index) || 0;
        this.buckets.set(index, current + count);
        this.count += count;
    }

    get(index) {
        return this.buckets.get(index) || 0;
    }

    getIndices() {
        return Array.from(this.buckets.keys()).sort((a, b) => a - b);
    }

    clear() {
        this.buckets.clear();
        this.count = 0;
    }
}

/**
 * UDDSketch implementation for approximate quantile estimation
 */
export class UDDSketch {
    /**
     * Create a new UDDSketch
     * @param {number} alpha - Relative accuracy parameter (0 < alpha < 1, default: 0.01)
     */
    constructor(alpha = 0.01) {
        if (alpha <= 0 || alpha >= 1) {
            throw new Error('Alpha must be between 0 and 1');
        }

        this.alpha = alpha;
        this.gamma = (1 + alpha) / (1 - alpha);
        this.logGamma = Math.log(this.gamma);
        this.minValue = 1e-9;

        this.positiveBuckets = new SparseBucketStore();
        this.negativeBuckets = new SparseBucketStore();
        this.zeroCount = 0;
        this.count = 0;
        this.min = Number.POSITIVE_INFINITY;
        this.max = Number.NEGATIVE_INFINITY;
    }

    /**
     * Map a positive value to its bucket index
     * @param {number} value - Positive value
     * @returns {number} Bucket index
     */
    _getBucketIndex(value) {
        return Math.ceil(Math.log(value / this.minValue) / this.logGamma);
    }

    /**
     * Get the representative value for a bucket index
     * @param {number} index - Bucket index
     * @returns {number} Representative value
     */
    _getBucketValue(index) {
        return this.minValue * Math.pow(this.gamma, index - 0.5);
    }

    /**
     * Add a value to the sketch
     * @param {number} value - Value to add
     */
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
        } else {
            const index = this._getBucketIndex(-value);
            this.negativeBuckets.add(index);
        }
    }

    /**
     * Calculate quantile (0 <= q <= 1)
     * @param {number} q - Quantile to calculate (0 = min, 0.5 = median, 1 = max)
     * @returns {number} Approximate quantile value
     */
    quantile(q) {
        if (q < 0 || q > 1) {
            throw new Error('Quantile must be between 0 and 1');
        }

        if (this.count === 0) return NaN;
        if (q === 0) return this.min;
        if (q === 1) return this.max;

        const targetRank = q * (this.count - 1);
        let currentRank = 0;

        // Process negative buckets (in reverse order)
        const negativeIndices = this.negativeBuckets.getIndices().reverse();
        for (const index of negativeIndices) {
            const bucketCount = this.negativeBuckets.get(index);
            if (currentRank + bucketCount > targetRank) {
                return -this._getBucketValue(index);
            }
            currentRank += bucketCount;
        }

        // Process zeros
        if (currentRank + this.zeroCount > targetRank) {
            return 0;
        }
        currentRank += this.zeroCount;

        // Process positive buckets
        const positiveIndices = this.positiveBuckets.getIndices();
        for (const index of positiveIndices) {
            const bucketCount = this.positiveBuckets.get(index);
            if (currentRank + bucketCount > targetRank) {
                return this._getBucketValue(index);
            }
            currentRank += bucketCount;
        }

        return this.max;
    }

    /**
     * Calculate percentile (0 <= p <= 100)
     * @param {number} p - Percentile to calculate (0-100)
     * @returns {number} Approximate percentile value
     */
    percentile(p) {
        if (p < 0 || p > 100) {
            throw new Error('Percentile must be between 0 and 100');
        }
        return this.quantile(p / 100);
    }

    /**
     * Calculate median (50th percentile)
     * @returns {number} Approximate median value
     */
    median() {
        return this.quantile(0.5);
    }

    /**
     * Reset the sketch to empty state
     */
    reset() {
        this.positiveBuckets.clear();
        this.negativeBuckets.clear();
        this.zeroCount = 0;
        this.count = 0;
        this.min = Number.POSITIVE_INFINITY;
        this.max = Number.NEGATIVE_INFINITY;
    }
}