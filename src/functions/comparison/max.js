import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Maximum function: max(a, b, c, ...)
 */
export class Max extends ScalarFunction {
    constructor() {
        super('max');
    }
    
    _execute(args) {
        if (args.length === 0) return undefined;
        return Math.max(...args);
    }
}