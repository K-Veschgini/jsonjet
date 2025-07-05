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
            return VisitorUtils.createObjectLiteral(properties);
        }
        return VisitorUtils.createObjectLiteral([]);
    },

    propertyList(ctx) {
        return VisitorUtils.visitArray(this, ctx.property);
    },

    property(ctx) {
        if (ctx.spreadExpression) {
            // Spread syntax: ...expr
            const expression = this.visit(ctx.spreadExpression);
            return `...${expression}`;
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
            hoppingWindowFunction: () => this.visit(ctx.hoppingWindowFunction),
            tumblingWindowFunction: () => this.visit(ctx.tumblingWindowFunction),
            sessionWindowFunction: () => this.visit(ctx.sessionWindowFunction)
        };

        for (const [key, handler] of Object.entries(windowFunctions)) {
            if (ctx[key]) return handler();
        }
        
        return 'null';
    },

    hoppingWindowFunction(ctx) {
        const size = this.visit(ctx.size);
        const hop = this.visit(ctx.hop);
        const timeField = ctx.timeField ? this.visit(ctx.timeField) : 'null';
        return `Operators.hopping_window(${size}, ${hop}, ${timeField})`;
    },

    tumblingWindowFunction(ctx) {
        const size = this.visit(ctx.size);
        const timeField = ctx.timeField ? this.visit(ctx.timeField) : 'null';
        return `Operators.tumbling_window(${size}, ${timeField})`;
    },

    sessionWindowFunction(ctx) {
        const timeout = this.visit(ctx.timeout);
        const timeField = this.visit(ctx.timeField);
        return `Operators.session_window(${timeout}, ${timeField})`;
    }
};