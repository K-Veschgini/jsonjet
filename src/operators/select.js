import { Operator } from '../core/operator.js';

export class Select extends Operator {
    constructor(selectFunction) {
        super();
        this.selectFunction = selectFunction;
    }
    
    async process(doc) {
        const result = this.selectFunction(doc);
        this.emit(result);
    }
}