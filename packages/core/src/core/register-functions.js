/**
 * Register all existing scalar functions to a Registry instance
 */

// Math functions
import { ExpFunction, PiFunction } from '../functions/math/index.js';

// Arithmetic functions
import { Add } from '../functions/arithmetic/add.js';
import { Sub } from '../functions/arithmetic/sub.js';
import { Mul } from '../functions/arithmetic/mul.js';
import { Div } from '../functions/arithmetic/div.js';
import { Mod } from '../functions/arithmetic/mod.js';
import { Pow } from '../functions/arithmetic/pow.js';
import { Neg } from '../functions/arithmetic/neg.js';
import { Abs } from '../functions/arithmetic/abs.js';

// Comparison functions
import { Eq } from '../functions/comparison/eq.js';
import { Ne } from '../functions/comparison/ne.js';
import { Lt } from '../functions/comparison/lt.js';
import { Le } from '../functions/comparison/le.js';
import { Gt } from '../functions/comparison/gt.js';
import { Ge } from '../functions/comparison/ge.js';
import { Min } from '../functions/comparison/min.js';
import { Max } from '../functions/comparison/max.js';

// Logical functions
import { And } from '../functions/logical/and.js';
import { Or } from '../functions/logical/or.js';
import { Not } from '../functions/logical/not.js';

/**
 * Register all scalar functions to a registry instance
 * @param {Registry} registry - Registry instance to register functions to
 */
export function registerFunctions(registry) {
    // Register math functions
    registry.registerFunction(new ExpFunction());
    registry.registerFunction(new PiFunction());
    
    // Register arithmetic functions
    registry.registerFunction(new Add());
    registry.registerFunction(new Sub());
    registry.registerFunction(new Mul());
    registry.registerFunction(new Div());
    registry.registerFunction(new Mod());
    registry.registerFunction(new Pow());
    registry.registerFunction(new Neg());
    registry.registerFunction(new Abs());
    
    // Register comparison functions
    registry.registerFunction(new Eq());
    registry.registerFunction(new Ne());
    registry.registerFunction(new Lt());
    registry.registerFunction(new Le());
    registry.registerFunction(new Gt());
    registry.registerFunction(new Ge());
    registry.registerFunction(new Min());
    registry.registerFunction(new Max());
    
    // Register logical functions
    registry.registerFunction(new And());
    registry.registerFunction(new Or());
    registry.registerFunction(new Not());
}