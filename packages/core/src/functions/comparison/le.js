import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Less than or equal function: a <= b
 */
export class Le extends ScalarFunction {
    constructor() {
        super('le');
    }
    
    _execute(args) {
        if (args.length !== 2) {
            throw new Error('le function requires exactly 2 arguments');
        }
        return args[0] <= args[1];
    }
}