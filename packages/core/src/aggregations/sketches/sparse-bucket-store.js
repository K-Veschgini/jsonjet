/**
 * SparseBucketStore - Map-based sparse histogram for UDDSketch
 */
export class SparseBucketStore {
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


