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
        const properties = [];
        
        // Handle spread syntax (...*) - same as select
        if (ctx.spreadAll) {
            properties.push('...item');
        }

        // Handle spread expression (...expr) - same as select
        if (ctx.spreadExpression) {
            const spreadExpressions = ctx.spreadExpression.map(expr => `...${this.visit(expr)}`);
            properties.push(...spreadExpressions);
        }

        // Handle regular properties
        if (ctx.propertyList) {
            const regularProperties = this.visit(ctx.propertyList);
            
            // Flatten if it's an array of arrays
            const flattenedProperties = Array.isArray(regularProperties) && Array.isArray(regularProperties[0]) ? regularProperties[0] : regularProperties;
            
            // Check if we have any exclusions
            const hasExclusions = flattenedProperties.some(prop => prop && prop.includes('__EXCLUDE_'));
            
            if (hasExclusions) {
                // Extract exclusions and regular properties
                const exclusions = flattenedProperties.filter(prop => prop && prop.includes('__EXCLUDE_'))
                    .map(prop => prop.match(/__EXCLUDE_(.+)__/)[1]);
                const regularProps = flattenedProperties.filter(prop => prop && !prop.includes('__EXCLUDE_') && typeof prop === 'string' && prop.trim() !== '');
                
                // Add regular properties
                properties.push(...regularProps);
                
                // Create object with exclusions handled
                const objStr = properties.length > 0 ? `{ ${properties.join(', ')} }` : '{}';
                const exclusionStr = exclusions.map(field => `'${field}'`).join(', ');
                return `((() => { const obj = ${objStr}; [${exclusionStr}].forEach(key => delete obj[key]); return obj; })())`;
            }
            
            const filtered = flattenedProperties.filter(prop => prop && typeof prop === 'string' && prop.trim() !== '');
            properties.push(...filtered);
        }
        
        return VisitorUtils.createObjectLiteral(properties.filter(p => p));
    },

    propertyList(ctx) {
        // Visit each property individually and filter out empty ones
        const properties = ctx.property.map(propertyCtx => this.visit(propertyCtx));
        const filtered = properties.filter(prop => prop && typeof prop === 'string' && prop.trim() !== '');
        return filtered;
    },

    property(ctx) {
        if (ctx.spreadAll) {
            // Spread all: ...*
            return `...item`;
        } else if (ctx.spreadExpression) {
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
            // Shorthand: identifier becomes key: safeGet(item, 'identifier') (like select does)
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
        } else if (ctx.scalarFunction) {
            return this.visit(ctx.scalarFunction);
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
            // Process arguments - should be a single object literal
            const args = this.visit(ctx.argumentList);
            return `return ${args}`;
        }
        return 'return null';
    },
    
    // Process emit object using the same logic as select
    processEmitObject(ctx) {
        const properties = [];
        
        // Handle spread syntax (...*)
        if (ctx.spreadAll) {
            properties.push('...item');
        }

        // Handle spread expression (...expr)
        if (ctx.spreadExpression) {
            const spreadExpressions = ctx.spreadExpression.map(expr => `...${this.visit(expr)}`);
            properties.push(...spreadExpressions);
        }

        // Handle regular properties
        if (ctx.propertyList && ctx.propertyList[0] && ctx.propertyList[0].property) {
            const regularProperties = ctx.propertyList[0].property.map(prop => this.processEmitProperty(prop));
            properties.push(...regularProperties.filter(p => p));
        }

        // Return object literal
        return VisitorUtils.createObjectLiteral(properties.filter(p => p));
    },
    
    // Process individual emit property using the same logic as selectProperty
    processEmitProperty(ctx) {
        if (ctx.propertyKey && ctx.propertyValue) {
            // Key-value pair: key: value
            const keyValue = this.visit(ctx.propertyKey);
            const value = this.visit(ctx.propertyValue);
            return `${keyValue}: ${value}`;
        } else if (ctx.shorthandProperty) {
            // Shorthand property: identifier -> identifier: item.identifier
            const identifier = VisitorUtils.getTokenImage(ctx.shorthandProperty);
            return `${identifier}: item.${identifier}`;
        }
        return '';
    },

    scalarFunction(ctx) {
        const functionName = VisitorUtils.getTokenImage(ctx.functionName);
        if (ctx.argumentList) {
            const args = this.visit(ctx.argumentList);
            return `functionRegistry.execute('${functionName}', [${args}])`;
        }
        return `functionRegistry.execute('${functionName}', [])`;
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