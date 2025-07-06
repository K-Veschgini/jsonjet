import { VisitorUtils } from '../core/base-visitor.js';
import { ErrorUtils } from '../errors/transpiler-errors.js';

// =============================================================================
// LITERAL VISITOR MIXIN
// =============================================================================
// Handles objects, arrays, functions, and property transpilation

export const LiteralVisitorMixin = {

    // =============================================================================
    // OBJECT LITERALS
    // =============================================================================

    objectLiteral(ctx) {
        if (ctx.propertyList) {
            const properties = this.visit(ctx.propertyList);
            
            // Check if we have any exclusions
            const hasExclusions = properties.some(prop => prop && prop.includes('__EXCLUDE_'));
            
            if (hasExclusions) {
                // Extract exclusions and regular properties
                const exclusions = properties.filter(prop => prop && prop.includes('__EXCLUDE_'))
                    .map(prop => prop.match(/__EXCLUDE_(.+)__/)[1]);
                const regularProps = properties.filter(prop => prop && !prop.includes('__EXCLUDE_') && typeof prop === 'string' && prop.trim() !== '');
                
                // Create object with exclusions handled
                const objStr = regularProps.length > 0 ? `{ ${regularProps.join(', ')} }` : '{}';
                const exclusionStr = exclusions.map(field => `'${field}'`).join(', ');
                return `((() => { const obj = ${objStr}; [${exclusionStr}].forEach(key => delete obj[key]); return obj; })())`;
            }
            
            return VisitorUtils.createObjectLiteral(properties.filter(prop => prop && typeof prop === 'string' && prop.trim() !== ''));
        }
        return VisitorUtils.createObjectLiteral([]);
    },

    propertyList(ctx) {
        // Visit each property individually and filter out empty ones
        const properties = ctx.property.map(propertyCtx => this.visit(propertyCtx)).filter(prop => prop && typeof prop === 'string' && prop.trim() !== '');
        return properties;
    },

    property(ctx) {
        if (ctx.spreadExpression) {
            // Spread syntax: ...expr
            const expression = this.visit(ctx.spreadExpression);
            return `...${expression}`;
        } else if (ctx.excludedProperty) {
            // Exclusion syntax: -field
            const identifier = VisitorUtils.getTokenImage(ctx.excludedProperty);
            return `__EXCLUDE_${identifier}__: undefined`;
        } else if (ctx.propertyKey && ctx.propertyValue) {
            // Key-value pair: key: value
            const key = this.visit(ctx.propertyKey);
            const value = this.visit(ctx.propertyValue);
            return `${key}: ${value}`;
        } else if (ctx.shorthandProperty) {
            // Shorthand: identifier becomes key: safeGet(item, identifier)
            const identifier = VisitorUtils.getTokenImage(ctx.shorthandProperty);
            return `${identifier}: ${VisitorUtils.createSafeAccess('item', identifier)}`;
        }
        
        return '';
    },

    // =============================================================================
    // PROPERTY KEYS - Clean lookup table approach
    // =============================================================================

    propertyKey(ctx) {
        // Use a lookup table instead of giant if/else chain
        const tokenToKeyword = {
            'Identifier': () => VisitorUtils.getTokenImage(ctx.Identifier),
            'StringLiteral': () => VisitorUtils.getTokenImage(ctx.StringLiteral),
            'Where': () => 'where',
            'Project': () => 'project', 
            'Scan': () => 'scan',
            'Step': () => 'step',
            'InsertInto': () => 'insert_into',
            'And': () => 'and',
            'Or': () => 'or',
            'Iff': () => 'iff',
            'Emit': () => 'emit',
            'Collect': () => 'collect',
            'Count': () => 'count',
            'Sum': () => 'sum'
        };

        for (const [tokenName, keywordFunc] of Object.entries(tokenToKeyword)) {
            if (ctx[tokenName]) {
                const keyName = keywordFunc();
                if (tokenName === 'StringLiteral') {
                    return keyName; // Already quoted
                }
                // Check if valid JS identifier, quote if needed
                return this._formatPropertyKey(keyName);
            }
        }
        
        return '';
    },

    _formatPropertyKey(keyName) {
        if (!keyName) return '';
        
        // Valid JS identifier regex
        const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
        
        if (validIdentifier.test(keyName)) {
            return keyName; // Can use unquoted
        } else {
            return `"${keyName}"`; // Must quote
        }
    },

    // =============================================================================
    // ARRAY LITERALS
    // =============================================================================

    arrayLiteral(ctx) {
        if (ctx.elementList) {
            const elements = this.visit(ctx.elementList);
            return `[${elements}]`;
        }
        return '[]';
    },

    elementList(ctx) {
        return VisitorUtils.visitArray(this, ctx.expression);
    },

    // =============================================================================
    // FUNCTION CALLS
    // =============================================================================

    functionCall(ctx) {
        if (ctx.iffFunction) {
            return this.visit(ctx.iffFunction);
        } else if (ctx.emitFunction) {
            return this.visit(ctx.emitFunction);
        }
        return '';
    },

    iffFunction(ctx) {
        const condition = this.visit(ctx.condition);
        const trueValue = this.visit(ctx.trueValue);
        const falseValue = this.visit(ctx.falseValue);
        
        return `(${condition} ? ${trueValue} : ${falseValue})`;
    },

    emitFunction(ctx) {
        if (ctx.argumentList) {
            const args = this.visit(ctx.argumentList);
            return `return ${args}`;
        }
        return 'return null';
    },

    argumentList(ctx) {
        return VisitorUtils.visitArray(this, ctx.expression);
    },

    // =============================================================================
    // WINDOW FUNCTIONS (for summarize operations)
    // =============================================================================

    windowDefinition(ctx) {
        const windowName = VisitorUtils.getTokenImage(ctx.windowName);
        const windowFunc = this.visit(ctx.windowFunctionCall);
        return {
            name: windowName,
            spec: windowFunc
        };
    },

    windowFunctionCall(ctx) {
        const windowFunctions = {
            // Count-based window functions
            hoppingWindowFunction: () => this.visit(ctx.hoppingWindowFunction),
            tumblingWindowFunction: () => this.visit(ctx.tumblingWindowFunction),
            slidingWindowFunction: () => this.visit(ctx.slidingWindowFunction),
            countWindowFunction: () => this.visit(ctx.countWindowFunction),
            sessionWindowFunction: () => this.visit(ctx.sessionWindowFunction),
            // Value-based window functions
            hoppingWindowByFunction: () => this.visit(ctx.hoppingWindowByFunction),
            tumblingWindowByFunction: () => this.visit(ctx.tumblingWindowByFunction),
            slidingWindowByFunction: () => this.visit(ctx.slidingWindowByFunction)
        };

        for (const [key, handler] of Object.entries(windowFunctions)) {
            if (ctx[key]) {
                return handler();
            }
        }
        
        return 'null';
    },

    // Count-based window functions
    hoppingWindowFunction(ctx) {
        const size = this.visit(ctx.size);
        const hop = this.visit(ctx.hop);
        return `Operators.hopping_window(${size}, ${hop})`;
    },

    tumblingWindowFunction(ctx) {
        const size = this.visit(ctx.size);
        return `Operators.tumbling_window(${size})`;
    },

    slidingWindowFunction(ctx) {
        const size = this.visit(ctx.size);
        return `Operators.sliding_window(${size})`;
    },

    countWindowFunction(ctx) {
        const size = this.visit(ctx.size);
        return `Operators.count_window(${size})`;
    },

    sessionWindowFunction(ctx) {
        const timeout = this.visit(ctx.timeout);
        const valueCallback = this.visit(ctx.valueCallback);
        return `Operators.session_window(${timeout}, (item) => ${valueCallback})`;
    },

    // Value-based window functions
    hoppingWindowByFunction(ctx) {
        const size = this.visit(ctx.size);
        const hop = this.visit(ctx.hop);
        const valueCallback = this.visit(ctx.valueCallback);
        return `Operators.hopping_window_by(${size}, ${hop}, (item) => ${valueCallback})`;
    },

    tumblingWindowByFunction(ctx) {
        const size = this.visit(ctx.size);
        const valueCallback = this.visit(ctx.valueCallback);
        return `Operators.tumbling_window_by(${size}, (item) => ${valueCallback})`;
    },

    slidingWindowByFunction(ctx) {
        const size = this.visit(ctx.size);
        const valueCallback = this.visit(ctx.valueCallback);
        return `Operators.sliding_window_by(${size}, (item) => ${valueCallback})`;
    }
};