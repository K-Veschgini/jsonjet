import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Negation function: -a
 */
export class Neg extends ScalarFunction {
    constructor() {
        super('neg');
    }
    
    _execute(args) {
        if (args.length !== 1) {
            throw new Error('neg function requires exactly 1 argument');
        }
        return -args[0];
    }
}