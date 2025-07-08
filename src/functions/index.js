/**
 * JSDB Scalar Functions
 * Central exports and registration
 */

export { ScalarFunction } from './core/scalar-function.js';
export { FunctionRegistry, functionRegistry } from './core/function-registry.js';
export { Config, config } from './core/function-config.js';

// Math functions
export { ExpFunction } from './math/index.js';

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

// Register all functions
import { functionRegistry } from './core/function-registry.js';
import { ExpFunction } from './math/index.js';

// Arithmetic functions
import { Add } from './arithmetic/add.js';
import { Sub } from './arithmetic/sub.js';
import { Mul } from './arithmetic/mul.js';
import { Div } from './arithmetic/div.js';
import { Mod } from './arithmetic/mod.js';
import { Pow } from './arithmetic/pow.js';
import { Neg } from './arithmetic/neg.js';
import { Abs } from './arithmetic/abs.js';

// Comparison functions
import { Eq } from './comparison/eq.js';
import { Ne } from './comparison/ne.js';
import { Lt } from './comparison/lt.js';
import { Le } from './comparison/le.js';
import { Gt } from './comparison/gt.js';
import { Ge } from './comparison/ge.js';
import { Min } from './comparison/min.js';
import { Max } from './comparison/max.js';

// Logical functions
import { And } from './logical/and.js';
import { Or } from './logical/or.js';
import { Not } from './logical/not.js';

// Auto-register all functions on import
functionRegistry.register(new ExpFunction());

// Register arithmetic functions
functionRegistry.register(new Add());
functionRegistry.register(new Sub());
functionRegistry.register(new Mul());
functionRegistry.register(new Div());
functionRegistry.register(new Mod());
functionRegistry.register(new Pow());
functionRegistry.register(new Neg());
functionRegistry.register(new Abs());

// Register comparison functions
functionRegistry.register(new Eq());
functionRegistry.register(new Ne());
functionRegistry.register(new Lt());
functionRegistry.register(new Le());
functionRegistry.register(new Gt());
functionRegistry.register(new Ge());
functionRegistry.register(new Min());
functionRegistry.register(new Max());

// Register logical functions
functionRegistry.register(new And());
functionRegistry.register(new Or());
functionRegistry.register(new Not());