/**
 * t-digest implementation for streaming quantiles
 * - Maintains centroids (mean, weight) with scale-function based compression
 * - Exports a stable, versioned JSON format: kind: 'tdigest:v1'
 */
export class TDigest {
    constructor(compression = 100) {
        if (typeof compression !== 'number' || !Number.isFinite(compression) || compression <= 0) {
            throw new Error('TDigest: compression must be a positive finite number');
        }
        this.compression = compression;
        this.maxCentroids = Math.max(50, Math.floor(6 * compression));
        this.centroids = []; // each: { mean: number, weight: number }
        this.count = 0;
        this.min = Number.POSITIVE_INFINITY;
        this.max = Number.NEGATIVE_INFINITY;
    }

    add(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new Error('TDigest.add: value must be a finite number');
        }
        this.count += 1;
        this.min = Math.min(this.min, value);
        this.max = Math.max(this.max, value);

        // Insert as a new centroid and periodically compress
        this.centroids.push({ mean: value, weight: 1 });
        if (this.centroids.length > this.maxCentroids * 2) {
            this._compress();
        }
    }

    reset() {
        this.centroids = [];
        this.count = 0;
        this.min = Number.POSITIVE_INFINITY;
        this.max = Number.NEGATIVE_INFINITY;
    }

    export() {
        // Sort centroids by mean ascending
        const centroids = this.centroids
            .slice()
            .sort((a, b) => a.mean - b.mean)
            .map(c => [c.mean, c.weight]);

        return {
            kind: 'tdigest:v1',
            compression: this.compression,
            count: this.count,
            min: this.min,
            max: this.max,
            centroids
        };
    }

    // Scale function k(q) and its inverse per t-digest
    _k(q) {
        // maps q in [0,1] monotonically; tails get more resolution
        return Math.asin(2 * q - 1) * this.compression / Math.PI;
    }

    _compress() {
        if (this.centroids.length <= 1) return;
        const N = this.count;
        if (N <= 0) return;
        // Sort by mean
        this.centroids.sort((a, b) => a.mean - b.mean);

        const merged = [];
        let curr = { mean: this.centroids[0].mean, weight: this.centroids[0].weight };
        let cumulative = 0; // weight before current centroid

        const tryMerge = (a, b, cumulativeBefore) => {
            // decide if we can merge b into a without violating size bound
            const aWeight = a.weight;
            const bWeight = b.weight;
            // q-positions at centers
            const qLeft = (cumulativeBefore + aWeight / 2) / N;
            const qRight = (cumulativeBefore + aWeight + bWeight / 2) / N;
            const kLeft = this._k(qLeft);
            const kRight = this._k(qRight);
            return (kRight - kLeft) <= 1;
        };

        for (let i = 1; i < this.centroids.length; i++) {
            const next = this.centroids[i];
            if (tryMerge(curr, next, cumulative)) {
                // merge next into curr
                const newWeight = curr.weight + next.weight;
                const newMean = (curr.mean * curr.weight + next.mean * next.weight) / newWeight;
                curr.mean = newMean;
                curr.weight = newWeight;
            } else {
                merged.push(curr);
                cumulative += curr.weight;
                curr = { mean: next.mean, weight: next.weight };
            }
        }
        merged.push(curr);
        this.centroids = merged;
    }

    /**
     * Compute quantile directly from an exported t-digest JSON (no instance required)
     */
    static computeQuantileFromExport(exported, q) {
        if (!exported || typeof exported !== 'object' || exported.kind !== 'tdigest:v1') {
            throw new Error('TDigest.computeQuantileFromExport: unsupported or invalid sketch; expected kind "tdigest:v1"');
        }
        if (typeof q !== 'number' || !Number.isFinite(q) || q < 0 || q > 1) {
            throw new Error('TDigest.computeQuantileFromExport: q must be a finite number in [0,1]');
        }

        const { count, min, max, centroids } = exported;
        if (!Number.isInteger(count) || count < 0) {
            throw new Error('TDigest.computeQuantileFromExport: invalid count');
        }
        if (count === 0) return NaN;
        if (q === 0) return min;
        if (q === 1) return max;

        const sorted = Array.isArray(centroids) ? centroids.slice().sort((a, b) => a[0] - b[0]) : [];
        // Total weight is count
        const totalWeight = count;
        if (totalWeight <= 0) return NaN;

        const target = q * totalWeight;
        // Use centroid intervals [cumulative - w/2, cumulative + w/2]
        let cumulative = 0;
        for (let i = 0; i < sorted.length; i++) {
            const [mean, weight] = sorted[i];
            const leftBoundary = cumulative;
            const rightBoundary = cumulative + weight;
            if (target < rightBoundary) {
                if (i === 0 && target < weight / 2) {
                    // interpolate between min and first centroid
                    const t = target / (weight / 2);
                    return min + (mean - min) * Math.max(0, Math.min(1, t));
                }
                if (i === sorted.length - 1 && target > totalWeight - weight / 2) {
                    const t = (target - (totalWeight - weight / 2)) / (weight / 2);
                    return mean + (max - mean) * Math.max(0, Math.min(1, t));
                }
                // interpolate between neighboring centroids
                const leftMean = i > 0 ? sorted[i - 1][0] : min;
                const rightMean = mean;
                const center = leftBoundary + weight / 2;
                const t = (target - (center - weight / 2)) / weight;
                return leftMean + (rightMean - leftMean) * Math.max(0, Math.min(1, t));
            }
            cumulative = rightBoundary;
        }
        return max;
    }

    /**
     * Get maximum relative error at quantile q. For t-digest, error varies with q(1-q),
     * with higher accuracy near the median. Error is roughly proportional to 1/(compression * q(1-q)).
     * 
     * @param {object} exported - Exported t-digest sketch
     * @param {number} q - Quantile in [0,1]
     * @returns {number} Maximum relative error at quantile q
     */
    static getRelativeError(exported, q) {
        if (!exported || typeof exported !== 'object' || exported.kind !== 'tdigest:v1') {
            throw new Error('TDigest.getRelativeError: unsupported or invalid sketch; expected kind "tdigest:v1"');
        }
        if (typeof q !== 'number' || !Number.isFinite(q) || q < 0 || q > 1) {
            throw new Error('TDigest.getRelativeError: q must be a finite number in [0,1]');
        }
        const { compression } = exported;
        if (!compression || compression <= 0) {
            throw new Error('TDigest.getRelativeError: invalid compression parameter');
        }
        // Error ~ 1/(compression * q(1-q))
        // At extremes (q=0 or q=1), q(1-q)=0 and JavaScript returns Infinity
        return 1 / (compression * q * (1 - q));
    }
}


