import { ScalarFunction } from '../core/scalar-function.js';

/**
 * Absolute value function: |a|
 */
export class Abs extends ScalarFunction {
    constructor() {
        super('abs');
    }
    
    _execute(args) {
        if (args.length !== 1) {
            throw new Error('abs function requires exactly 1 argument');
        }
        return Math.abs(args[0]);
    }
}