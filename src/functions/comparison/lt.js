import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Less than function: a < b
 */
export class Lt extends ScalarFunction {
    constructor() {
        super('lt');
    }
    
    _execute(args) {
        if (args.length !== 2) {
            throw new Error('lt function requires exactly 2 arguments');
        }
        return args[0] < args[1];
    }
}