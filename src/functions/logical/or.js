import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Logical OR function: a || b || c || ...
 */
export class Or extends ScalarFunction {
    constructor() {
        super('or');
    }
    
    _execute(args) {
        if (args.length === 0) return false;
        return args.some(arg => !!arg);
    }
}