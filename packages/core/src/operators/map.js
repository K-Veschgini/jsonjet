import { Operator } from '../core/operator.js';

export class Map extends Operator {
    constructor(mapper) {
        super();
        this.mapper = mapper;
    }
    
    async process(doc) {
        const result = this.mapper(doc);
        this.emit(result);
    }
} 