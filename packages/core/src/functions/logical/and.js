import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Logical AND function: a && b && c && ...
 */
export class And extends ScalarFunction {
    constructor() {
        super('and');
    }
    
    _execute(args) {
        if (args.length === 0) return true;
        return args.every(arg => !!arg);
    }
}