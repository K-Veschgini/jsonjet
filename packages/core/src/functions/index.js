/**
 * JSDB Scalar Functions
 * Central exports and registration functions
 */

export { ScalarFunction } from './core/scalar-function.js';
export { Config, config } from './core/function-config.js';

// Math functions
export { ExpFunction, PiFunction } from './math/index.js';

// Arithmetic functions
export { Add } from './arithmetic/add.js';
export { Sub } from './arithmetic/sub.js';
export { Mul } from './arithmetic/mul.js';
export { Div } from './arithmetic/div.js';
export { Mod } from './arithmetic/mod.js';
export { Pow } from './arithmetic/pow.js';
export { Neg } from './arithmetic/neg.js';
export { Abs } from './arithmetic/abs.js';

// Comparison functions
export { Eq } from './comparison/eq.js';
export { Ne } from './comparison/ne.js';
export { Lt } from './comparison/lt.js';
export { Le } from './comparison/le.js';
export { Gt } from './comparison/gt.js';
export { Ge } from './comparison/ge.js';
export { Min } from './comparison/min.js';
export { Max } from './comparison/max.js';

// Logical functions
export { And } from './logical/and.js';
export { Or } from './logical/or.js';
export { Not } from './logical/not.js';

// Sketch functions
export { QuantileFunction } from './sketches/quantile.js';
export { QuantileErrorFunction } from './sketches/quantile_error.js';

// Import functions for registration
import { ExpFunction, PiFunction } from './math/index.js';
import { Add } from './arithmetic/add.js';
import { Sub } from './arithmetic/sub.js';
import { Mul } from './arithmetic/mul.js';
import { Div } from './arithmetic/div.js';
import { Mod } from './arithmetic/mod.js';
import { Pow } from './arithmetic/pow.js';
import { Neg } from './arithmetic/neg.js';
import { Abs } from './arithmetic/abs.js';
import { Eq } from './comparison/eq.js';
import { Ne } from './comparison/ne.js';
import { Lt } from './comparison/lt.js';
import { Le } from './comparison/le.js';
import { Gt } from './comparison/gt.js';
import { Ge } from './comparison/ge.js';
import { Min } from './comparison/min.js';
import { Max } from './comparison/max.js';
import { And } from './logical/and.js';
import { Or } from './logical/or.js';
import { Not } from './logical/not.js';
import { QuantileFunction } from './sketches/quantile.js';
import { QuantileErrorFunction } from './sketches/quantile_error.js';

/**
 * Register browser-safe functions to a registry instance
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

    // Register sketch functions
    registry.registerFunction(new QuantileFunction());
    registry.registerFunction(new QuantileErrorFunction());
}