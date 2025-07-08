import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Minimum function: min(a, b, c, ...)
 */
export class Min extends ScalarFunction {
    constructor() {
        super('min');
    }
    
    _execute(args) {
        if (args.length === 0) return undefined;
        return Math.min(...args);
    }
}