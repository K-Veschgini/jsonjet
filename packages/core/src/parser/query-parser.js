// Compatibility layer for the old query-parser.js interface
// This ensures existing imports continue to work while using the new clean architecture

export { 
    QueryParser, 
    parseQuery, 
    QueryLexer, 
    allTokens 
} from './grammar/query-parser.js';