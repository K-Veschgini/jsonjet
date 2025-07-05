import { getBaseCstVisitorConstructor, VisitorUtils } from './base-visitor.js';
import { ErrorUtils, TranspilerError } from '../errors/transpiler-errors.js';

// Import visitor mixins
import { ExpressionVisitorMixin } from '../visitors/expression-visitor.js';
import { QueryOperationVisitorMixin } from '../visitors/query-operation-visitor.js';
import { LiteralVisitorMixin } from '../visitors/literal-visitor.js';
import { CommandVisitorMixin } from '../visitors/command-visitor.js';

// =============================================================================
// MAIN QUERY TRANSPILER CLASS
// =============================================================================
// Clean, modular architecture using visitor mixins

export class QueryTranspiler {
    constructor() {
        // Get the base visitor constructor
        const BaseCstVisitor = getBaseCstVisitorConstructor();
        
        // Create the visitor instance
        this._visitor = new (class extends BaseCstVisitor {
            constructor() {
                super();
                // Don't validate visitor here - we'll do it after mixins are applied
            }
        })();

        // Apply all visitor mixins to the instance
        this._applyMixins();
    }

    /**
     * Apply visitor mixins to create a complete transpiler
     */
    _applyMixins() {
        const mixins = [
            ExpressionVisitorMixin,
            QueryOperationVisitorMixin, 
            LiteralVisitorMixin,
            CommandVisitorMixin
        ];

        // Apply each mixin to the visitor instance
        mixins.forEach(mixin => {
            Object.keys(mixin).forEach(methodName => {
                if (typeof mixin[methodName] === 'function') {
                    // Wrap each method with error handling
                    this._visitor[methodName] = ErrorUtils.wrapVisitorMethod(
                        methodName,
                        mixin[methodName],
                        this._visitor
                    );
                }
            });
        });

        // Add core visitor methods
        this._addCoreVisitorMethods();
        
        // Now validate the visitor after all methods are added
        this._visitor.validateVisitor();
    }

    /**
     * Add core visitor methods that coordinate the transpilation process
     */
    _addCoreVisitorMethods() {
        // Main entry point for transpilation
        this._visitor.query = ErrorUtils.wrapVisitorMethod('query', function(ctx) {
            if (ctx.dotCommand) {
                // Handle dot commands (.create, .insert, etc.)
                return this.visit(ctx.dotCommand);
            } else if (ctx.command) {
                // Handle print commands (.print expression)
                return this.visit(ctx.command);
            } else {
                // Handle regular query pipeline
                let jsCode = '';
                
                // Start with the source (we don't use the source name in pipeline code)
                const sourceName = this.visit(ctx.source);
                
                // Add pipe operations
                if (ctx.operation) {
                    for (const operation of ctx.operation) {
                        const operationCode = this.visit(operation);
                        jsCode += operationCode;
                    }
                }
                
                return jsCode;
            }
        }, this._visitor);

        // Source handling
        this._visitor.source = ErrorUtils.wrapVisitorMethod('source', function(ctx) {
            return VisitorUtils.getTokenImage(ctx.sourceName);
        }, this._visitor);

        // Delegate visitor calls to the internal visitor
        this._visitor.visit = function(ctx) {
            if (!ctx) return '';
            
            // Handle arrays
            if (Array.isArray(ctx)) {
                return ctx.map(item => this.visit(item));
            }
            
            // Use the base visit method
            return Object.getPrototypeOf(Object.getPrototypeOf(this)).visit.call(this, ctx);
        };
    }

    /**
     * Main transpilation method
     */
    visit(cst) {
        try {
            return this._visitor.visit(cst);
        } catch (error) {
            if (error instanceof TranspilerError) {
                throw error;
            }
            throw new TranspilerError(`Transpilation failed: ${error.message}`, {
                originalError: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Get the internal visitor instance (for advanced usage)
     */
    getVisitor() {
        return this._visitor;
    }
}

// =============================================================================
// MIXIN UTILITY (for future extensibility)
// =============================================================================

export class TranspilerMixinUtils {
    /**
     * Create a custom transpiler with additional mixins
     */
    static createCustomTranspiler(additionalMixins = []) {
        const transpiler = new QueryTranspiler();
        
        // Apply additional mixins
        additionalMixins.forEach(mixin => {
            Object.keys(mixin).forEach(methodName => {
                if (typeof mixin[methodName] === 'function') {
                    transpiler._visitor[methodName] = ErrorUtils.wrapVisitorMethod(
                        methodName,
                        mixin[methodName],
                        transpiler._visitor
                    );
                }
            });
        });

        return transpiler;
    }

    /**
     * Validate that a mixin has the expected structure
     */
    static validateMixin(mixin, requiredMethods = []) {
        if (typeof mixin !== 'object' || mixin === null) {
            throw new TranspilerError('Mixin must be an object');
        }

        const missing = requiredMethods.filter(method => 
            typeof mixin[method] !== 'function'
        );

        if (missing.length > 0) {
            throw new TranspilerError(
                `Mixin missing required methods: ${missing.join(', ')}`
            );
        }

        return true;
    }
}