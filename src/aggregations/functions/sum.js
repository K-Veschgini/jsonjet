import { Aggregation } from '../core/aggregation.js';

export class Sum extends Aggregation {
    constructor() {
        super();
        this.sum = 0;
    }
    
    push(value) {
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