import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Power function: a ^ b
 */
export class Pow extends ScalarFunction {
    constructor() {
        super('pow');
    }
    
    _execute(args) {
        if (args.length !== 2) {
            throw new Error('pow function requires exactly 2 arguments');
        }
        return Math.pow(args[0], args[1]);
    }
}