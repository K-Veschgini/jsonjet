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
        const totalWeight = count;
        if (totalWeight <= 0) return NaN;

        // Special case: single centroid
        if (sorted.length === 1) {
            const [mean, weight] = sorted[0];
            // For a single centroid, interpolate through the entire data range
            // considering the centroid represents the center of mass
            const leftPortion = q;
            const rightPortion = 1 - q;
            // Weight towards min or max based on quantile position
            return mean + (min - mean) * Math.pow(1 - q, 2) + (max - mean) * Math.pow(q, 2);
        }

        const target = q * totalWeight;
        
        // Build cumulative weight boundaries for each centroid
        let cumWeight = 0;
        const boundaries = [];
        for (let i = 0; i < sorted.length; i++) {
            const [mean, weight] = sorted[i];
            boundaries.push({
                mean,
                weight,
                cumStart: cumWeight,
                cumEnd: cumWeight + weight,
                cumCenter: cumWeight + weight / 2
            });
            cumWeight += weight;
        }

        // Handle extreme left tail (before first centroid's center)
        const firstBoundary = boundaries[0];
        if (target <= firstBoundary.cumCenter) {
            // Between min and first centroid
            // Use quadratic interpolation for smoother tail behavior
            const t = target / firstBoundary.cumCenter;
            const linear = min + (firstBoundary.mean - min) * t;
            const quadratic = min + (firstBoundary.mean - min) * t * t;
            // Blend linear and quadratic based on how close we are to the edge
            return linear * t + quadratic * (1 - t);
        }

        // Handle extreme right tail (after last centroid's center)
        const lastBoundary = boundaries[boundaries.length - 1];
        if (target >= lastBoundary.cumCenter) {
            // Between last centroid and max
            const tailStart = lastBoundary.cumCenter;
            const tailRange = totalWeight - tailStart;
            if (tailRange > 0) {
                const t = (target - tailStart) / tailRange;
                const linear = lastBoundary.mean + (max - lastBoundary.mean) * t;
                const quadratic = lastBoundary.mean + (max - lastBoundary.mean) * (2 * t - t * t);
                // Blend based on position in tail
                return linear * (1 - t) + quadratic * t;
            }
            return lastBoundary.mean;
        }

        // General case: find the two centroids whose centers bracket the target
        for (let i = 1; i < boundaries.length; i++) {
            const prev = boundaries[i - 1];
            const curr = boundaries[i];
            
            if (target >= prev.cumCenter && target <= curr.cumCenter) {
                // Interpolate between centroid means, considering their weights
                const range = curr.cumCenter - prev.cumCenter;
                if (range > 0) {
                    const t = (target - prev.cumCenter) / range;
                    
                    // Consider the relative weights of the centroids
                    // Heavier centroids should have more influence on nearby quantiles
                    const weightRatio = curr.weight / (prev.weight + curr.weight);
                    const adjustedT = t * (1 - weightRatio) + t * t * weightRatio;
                    
                    return prev.mean + (curr.mean - prev.mean) * adjustedT;
                }
                return prev.mean;
            }
        }

        // Fallback (should not reach here)
        return boundaries[boundaries.length - 1].mean;
    }

    /**
     * Compute CDF(x) = P(X <= x) from exported t-digest
     */
    static computeCdfFromExport(exported, x) {
        if (!exported || typeof exported !== 'object' || exported.kind !== 'tdigest:v1') {
            throw new Error('TDigest.computeCdfFromExport: unsupported or invalid sketch; expected kind "tdigest:v1"');
        }
        if (typeof x !== 'number' || !Number.isFinite(x)) {
            throw new Error('TDigest.computeCdfFromExport: x must be a finite number');
        }
        const { count, min, max, centroids } = exported;
        if (!Number.isInteger(count) || count < 0) {
            throw new Error('TDigest.computeCdfFromExport: invalid count');
        }
        if (count === 0) return NaN;
        if (x <= min) return 0;
        if (x >= max) return 1;

        const sorted = Array.isArray(centroids) ? centroids.slice().sort((a, b) => a[0] - b[0]) : [];
        let cumulative = 0;
        for (let i = 0; i < sorted.length; i++) {
            const [mean, weight] = sorted[i];
            if (x < mean) {
                // Linearly split weight around mean using neighboring centroids/min/max
                const leftMean = i > 0 ? sorted[i - 1][0] : min;
                const rightMean = mean;
                const t = (x - leftMean) / (rightMean - leftMean || 1);
                const frac = Math.max(0, Math.min(1, t));
                cumulative += weight * frac; // portion of this centroid's mass to the left of x
                return cumulative / count;
            }
            cumulative += weight;
        }
        return 1;
    }

    /**
     * Approximate rank index for value x based on CDF
     */
    static computeRankFromExport(exported, x) {
        const { count } = exported || {};
        if (!Number.isInteger(count) || count < 0) {
            throw new Error('TDigest.computeRankFromExport: invalid count');
        }
        const cdf = TDigest.computeCdfFromExport(exported, x);
        if (!Number.isFinite(cdf)) return NaN;
        return cdf * count;
    }

    /**
     * Estimate absolute CDF error at x. For t-digest with centroids, a conservative bound
     * is roughly half of the largest single centroid weight near x divided by total count.
     */
    static getCdfErrorFromExport(exported, x) {
        if (!exported || typeof exported !== 'object' || exported.kind !== 'tdigest:v1') {
            throw new Error('TDigest.getCdfErrorFromExport: unsupported or invalid sketch; expected kind "tdigest:v1"');
        }
        if (typeof x !== 'number' || !Number.isFinite(x)) {
            throw new Error('TDigest.getCdfErrorFromExport: x must be a finite number');
        }
        const { count, centroids, min, max } = exported;
        if (!Number.isInteger(count) || count <= 0) return NaN;
        const sorted = Array.isArray(centroids) ? centroids.slice().sort((a, b) => a[0] - b[0]) : [];
        if (sorted.length === 0) return NaN;

        // Find nearest centroid to x
        let best = sorted[0];
        let bestDist = Math.abs(x - (best ? best[0] : min));
        for (let i = 1; i < sorted.length; i++) {
            const d = Math.abs(x - sorted[i][0]);
            if (d < bestDist) { best = sorted[i]; bestDist = d; }
        }
        const maxLocalWeight = best ? best[1] : 0;
        return (maxLocalWeight / 2) / count;
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


