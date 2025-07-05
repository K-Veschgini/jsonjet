// Compatibility layer for the old query-transpiler.js interface
// This ensures existing imports continue to work while using the new clean architecture

export { 
    QueryTranspiler,
    transpileQuery, 
    createQueryFunction
} from './transpiler/index.js';