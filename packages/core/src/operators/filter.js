import { Operator } from '../core/operator.js';

export class Filter extends Operator {
    constructor(predicate) {
        super();
        this.predicate = predicate;
    }
    
    async process(doc) {
        if (this.predicate(doc)) {
            this.emit(doc);
        }
    }
} 