import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Modulo function: a % b
 */
export class Mod extends ScalarFunction {
    constructor() {
        super('mod');
    }
    
    _execute(args) {
        if (args.length !== 2) {
            throw new Error('mod function requires exactly 2 arguments');
        }
        return args[0] % args[1];
    }
}