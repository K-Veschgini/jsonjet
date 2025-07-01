import { Aggregation } from '../core/aggregation.js';

export class Sum extends Aggregation {
    constructor(keyPath = null) {
        super();
        this.sum = 0;
        this.keyPath = keyPath; // Optional key path for nested properties
    }
    
    //TODO: consider, int type, overflow, exact float summation= ...
    push(object) {
        let value = object;
        if (this.keyPath) {
            // Navigate to nested property if keyPath is specified
            const keys = this.keyPath.split('.');
            for (const key of keys) {
                value = value?.[key];
            }
        }
        
        if (typeof value === 'number') {
            this.sum += value;
        }
    }
    
    getResult() {
        return this.sum;
    }
    
    reset() {
        this.sum = 0;
    }
} 