import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Equality function: a == b
 */
export class Eq extends ScalarFunction {
    constructor() {
        super('eq');
    }
    
    _execute(args) {
        if (args.length !== 2) {
            throw new Error('eq function requires exactly 2 arguments');
        }
        return args[0] == args[1];
    }
}