import { VisitorUtils } from '../core/base-visitor.js';
import { ErrorUtils } from '../errors/transpiler-errors.js';

// =============================================================================
// EXPRESSION VISITOR MIXIN
// =============================================================================
// Handles all expression transpilation with clean operator precedence

export const ExpressionVisitorMixin = {
    
    // =============================================================================
    // LOGICAL EXPRESSIONS (||, &&)
    // =============================================================================
    
    expression(ctx) {
        let result = this.visit(ctx.andExpression[0]);
        
        if (ctx.andExpression.length > 1) {
            for (let i = 1; i < ctx.andExpression.length; i++) {
                const rightExpr = this.visit(ctx.andExpression[i]);
                result = `(${result}) || (${rightExpr})`;
            }
        }
        
        return result;
    },

    andExpression(ctx) {
        let result = this.visit(ctx.comparisonExpression[0]);
        
        if (ctx.comparisonExpression.length > 1) {
            for (let i = 1; i < ctx.comparisonExpression.length; i++) {
                const rightExpr = this.visit(ctx.comparisonExpression[i]);
                result = `(${result}) && (${rightExpr})`;
            }
        }
        
        return result;
    },

    // =============================================================================
    // COMPARISON EXPRESSIONS (==, !=, <, >, <=, >=)
    // =============================================================================
    
    comparisonExpression(ctx) {
        const left = this.visit(ctx.arithmeticExpression[0]);
        
        if (ctx.arithmeticExpression.length === 1) {
            return left;
        }
        
        const right = this.visit(ctx.arithmeticExpression[1]);
        const operator = this._getComparisonOperator(ctx);
        
        return `${left} ${operator} ${right}`;
    },

    _getComparisonOperator(ctx) {
        const operatorMap = {
            'Equals': '===',
            'NotEquals': '!==',
            'LessThan': '<',
            'GreaterThan': '>',
            'LessEquals': '<=',
            'GreaterEquals': '>='
        };

        for (const [tokenName, operator] of Object.entries(operatorMap)) {
            if (ctx[tokenName]) return operator;
        }
        
        throw ErrorUtils.createDetailedError(
            'Unknown comparison operator',
            ctx,
            { availableOperators: Object.keys(operatorMap) }
        );
    },

    // =============================================================================
    // ARITHMETIC EXPRESSIONS (+, -, *, /)
    // =============================================================================
    
    arithmeticExpression(ctx) {
        let result = this.visit(ctx.termExpression[0]);
        
        for (let i = 1; i < ctx.termExpression.length; i++) {
            const right = this.visit(ctx.termExpression[i]);
            const operator = this._getArithmeticOperator(ctx, i - 1);
            result = `${result} ${operator} ${right}`;
        }
        
        return result;
    },

    termExpression(ctx) {
        let result = this.visit(ctx.primaryExpression[0]);
        
        for (let i = 1; i < ctx.primaryExpression.length; i++) {
            const right = this.visit(ctx.primaryExpression[i]);
            const operator = this._getTermOperator(ctx, i - 1);
            result = `${result} ${operator} ${right}`;
        }
        
        return result;
    },

    _getArithmeticOperator(ctx, index) {
        // Check for operators in different possible forms
        if (ctx.Plus && (ctx.Plus[index] || ctx.Plus.length > index)) return '+';
        if (ctx.Minus && (ctx.Minus[index] || ctx.Minus.length > index)) return '-';
        if (ctx.Or && (ctx.Or[index] || ctx.Or.length > index)) return '||';  // Logical OR at arithmetic level
        
        // If we have any operator tokens, use the first one we find
        if (ctx.Plus && ctx.Plus.length > 0) return '+';
        if (ctx.Minus && ctx.Minus.length > 0) return '-';
        if (ctx.Or && ctx.Or.length > 0) return '||';
        
        throw ErrorUtils.createDetailedError('Unknown arithmetic operator', ctx, {
            availableOperators: ['Plus', 'Minus', 'Or'],
            contextKeys: Object.keys(ctx),
            plusLength: ctx.Plus?.length,
            minusLength: ctx.Minus?.length,
            orLength: ctx.Or?.length
        });
    },

    _getTermOperator(ctx, index) {
        // Check for operators in different possible forms
        if (ctx.Multiply && (ctx.Multiply[index] || ctx.Multiply.length > index)) return '*';
        if (ctx.Divide && (ctx.Divide[index] || ctx.Divide.length > index)) return '/';
        if (ctx.And && (ctx.And[index] || ctx.And.length > index)) return '&&';  // Logical AND at term level
        
        // If we have any operator tokens, use the first one we find
        if (ctx.Multiply && ctx.Multiply.length > 0) return '*';
        if (ctx.Divide && ctx.Divide.length > 0) return '/';
        if (ctx.And && ctx.And.length > 0) return '&&';
        
        throw ErrorUtils.createDetailedError('Unknown term operator', ctx, {
            availableOperators: ['Multiply', 'Divide', 'And'],
            contextKeys: Object.keys(ctx),
            multiplyLength: ctx.Multiply?.length,
            divideLength: ctx.Divide?.length,
            andLength: ctx.And?.length
        });
    },

    // =============================================================================
    // PRIMARY AND ATOMIC EXPRESSIONS
    // =============================================================================
    
    primaryExpression(ctx) {
        let result = this.visit(ctx.atomicExpression);
        
        // Handle member access chains: obj.prop, arr[index], etc.
        if (ctx.index || ctx.property) {
            const accessCount = Math.max(
                ctx.index ? ctx.index.length : 0,
                ctx.property ? ctx.property.length : 0
            );
            
            for (let i = 0; i < accessCount; i++) {
                if (ctx.index && ctx.index[i]) {
                    // Array/object access: expr[index]
                    const index = this.visit(ctx.index[i]);
                    result = `${result}[${index}]`;
                } else if (ctx.property && ctx.property[i]) {
                    // Property access: expr.property
                    const property = VisitorUtils.getTokenImage(ctx.property[i]);
                    result = `${result}.${property}`;
                }
            }
        }
        
        return result;
    },

    atomicExpression(ctx) {
        // Use a lookup table for cleaner dispatch
        const handlers = {
            functionCall: () => this.visit(ctx.functionCall),
            objectLiteral: () => this.visit(ctx.objectLiteral),
            arrayLiteral: () => this.visit(ctx.arrayLiteral),
            stepVariable: () => this.visit(ctx.stepVariable),
            StringLiteral: () => VisitorUtils.getTokenImage(ctx.StringLiteral),
            NumberLiteral: () => VisitorUtils.getTokenImage(ctx.NumberLiteral),
            BooleanLiteral: () => VisitorUtils.getTokenImage(ctx.BooleanLiteral)?.toLowerCase(),
            NullLiteral: () => 'null',
            expression: () => `(${this.visit(ctx.expression)})`  // Parenthesized
        };

        for (const [key, handler] of Object.entries(handlers)) {
            if (ctx[key]) return handler();
        }
        
        return '';
    },

    // =============================================================================
    // STEP VARIABLES (for property access and scan operations)
    // =============================================================================
    
    stepVariable(ctx) {
        const stepOrVariable = VisitorUtils.getTokenImage(ctx.stepOrVariable);
        
        if (ctx.variableName) {
            // stepName.variableName - access from state
            const variableName = VisitorUtils.getTokenImage(ctx.variableName);
            return VisitorUtils.createSafeAccess('state', `${stepOrVariable}.${variableName}`);
        } else {
            // just variableName - access from current item
            return VisitorUtils.createSafeAccess('item', stepOrVariable);
        }
    }
};