import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Addition function: a + b + c + ...
 */
export class Add extends ScalarFunction {
    constructor() {
        super('add');
    }
    
    _execute(args) {
        if (args.length === 0) return 0;
        return args.reduce((sum, val) => sum + val, 0);
    }
}