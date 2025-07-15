import { Aggregation } from '../core/aggregation.js';

export class Count extends Aggregation {
    constructor() {
        super();
        this.count = 0;
    }
    
    push(object) {
        this.count++;
    }
    
    getResult() {
        return this.count;
    }
    
    reset() {
        this.count = 0;
    }
    
    clone() {
        return new Count();
    }
} 