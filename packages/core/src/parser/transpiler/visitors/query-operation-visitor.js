import { VisitorUtils } from '../core/base-visitor.js';
import { ErrorUtils } from '../errors/transpiler-errors.js';

// =============================================================================
// QUERY OPERATION VISITOR MIXIN
// =============================================================================
// Handles WHERE, SELECT, PROJECT, SUMMARIZE, SCAN operations

export const QueryOperationVisitorMixin = {

    // =============================================================================
    // PIPELINE OPERATIONS
    // =============================================================================

    operation(ctx) {
        const operationMap = {
            whereClause: () => this.visit(ctx.whereClause),
            selectClause: () => this.visit(ctx.selectClause),
            scanClause: () => this.visit(ctx.scanClause),
            summarizeClause: () => this.visit(ctx.summarizeClause),
            insertIntoClause: () => this.visit(ctx.insertIntoClause),
            writeToFileClause: () => this.visit(ctx.writeToFileClause),
            assertOrSaveExpectedClause: () => this.visit(ctx.assertOrSaveExpectedClause)
        };

        for (const [key, handler] of Object.entries(operationMap)) {
            if (ctx[key]) return handler();
        }
        
        return '';
    },

    // =============================================================================
    // WHERE CLAUSE
    // =============================================================================

    whereClause(ctx) {
        const condition = this.visit(ctx.expression);
        return `.pipe(new Operators.Filter(item => ${condition}))`;
    },

    // =============================================================================
    // SELECT CLAUSE (Modern, clean syntax)
    // =============================================================================

    selectClause(ctx) {
        const selectCode = this.visit(ctx.selectObject);
        // Wrap in parentheses to ensure object literal syntax
        return `.pipe(new Operators.Select((item) => (${selectCode})))`;
    },

    selectObject(ctx) {
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
        if (ctx.selectProperty) {
            const regularProperties = ctx.selectProperty.map(prop => this.visit(prop));
            properties.push(...regularProperties);
        }

        // Handle exclusions (-field) - create an object and delete properties
        if (ctx.excludeField) {
            const excludeFields = ctx.excludeField.map(field => 
                field.image || field[0]?.image || ''
            );
            
            const objStr = properties.length > 0 ? `{ ${properties.join(', ')} }` : '{}';
            const exclusionStr = excludeFields.map(field => `'${field}'`).join(', ');
            return `((() => { const obj = ${objStr}; [${exclusionStr}].forEach(key => delete obj[key]); return obj; })())`;
        }

        // No exclusions - return regular object literal
        return VisitorUtils.createObjectLiteral(properties.filter(p => p));
    },

    selectProperty(ctx) {
        if (ctx.propertyKey && ctx.propertyValue) {
            // Key-value pair: key: value
            const keyValue = this.visit(ctx.propertyKey);
            const value = this.visit(ctx.propertyValue);
            return `${keyValue}: ${value}`;
        } else if (ctx.shorthandProperty) {
            // Shorthand property: identifier -> identifier: safeGet(item, 'identifier')
            const identifier = VisitorUtils.getTokenImage(ctx.shorthandProperty);
            return `${identifier}: ${VisitorUtils.createSafeAccess('item', identifier)}`;
        }
        return '';
    },


    // =============================================================================
    // SUMMARIZE CLAUSE
    // =============================================================================

    summarizeClause(ctx) {
        const aggregationObject = this.visit(ctx.aggregationObject);
        
        let groupByCallback = 'null';
        if (ctx.byExpressionList) {
            const byExpressions = this.visit(ctx.byExpressionList);
            groupByCallback = `(item) => ${byExpressions}`;
        }
        
        let windowSpec = 'null';
        let emitSpec = 'null';
        let windowVariableName = "'window'";
        
        if (ctx.windowDefinition) {
            const windowDefArray = this.visit(ctx.windowDefinition);
            const windowDef = Array.isArray(windowDefArray) ? windowDefArray[0] : windowDefArray;
            // Also handle spec that may be wrapped in arrays
            let spec = windowDef.spec;
            if (Array.isArray(spec)) {
                // Flatten nested arrays
                while (Array.isArray(spec) && spec.length > 0) {
                    spec = spec[0];
                }
            }
            windowSpec = spec;
            windowVariableName = `'${windowDef.name}'`;
        } else if (ctx.emitClause) {
            emitSpec = this.visit(ctx.emitClause);
        }
        
        return `.pipe(Operators.createSummarizeOperator(${aggregationObject}, ${groupByCallback}, ${windowSpec}, ${emitSpec}, ${windowVariableName}))`;
    },

    aggregationObject(ctx) {
        if (ctx.aggregationPropertyList) {
            const properties = this.visit(ctx.aggregationPropertyList);
            
            // Flatten the properties array if it's nested
            const propArray = Array.isArray(properties) && Array.isArray(properties[0]) ? properties[0] : properties;
            
            // Check if we have any spreads or exclusions
            const hasSpreads = propArray.some(prop => prop && typeof prop === 'string' && prop.startsWith('...'));
            const hasExclusions = propArray.some(prop => prop && prop.type === 'exclusion');
            
            if (hasSpreads || hasExclusions) {
                // Separate spreads, exclusions, and regular properties
                const spreads = propArray.filter(prop => prop && typeof prop === 'string' && prop.startsWith('...'));
                const exclusions = propArray.filter(prop => prop && prop.type === 'exclusion').map(prop => prop.field);
                const regularProps = propArray.filter(prop => 
                    prop && typeof prop === 'string' && !prop.startsWith('...') && prop.type !== 'exclusion' && prop.trim() !== ''
                );
                
                // Create function-based approach for summarize
                const objStr = regularProps.length > 0 ? `{ ${regularProps.join(', ')} }` : '{}';
                const spreadChecks = spreads.map(spread => {
                    const expr = spread.substring(3); // Remove '...'
                    return `if (typeof context.${expr} !== 'object' || context.${expr} === null) throw new Error('Cannot spread ${expr}: not an object');`;
                }).join('\n');
                const spreadAssigns = spreads.map(spread => {
                    const expr = spread.substring(3); // Remove '...'
                    return `Object.assign(result, context.${expr});`;
                }).join('\n');
                const exclusionStr = exclusions.map(field => `'${field}'`).join(', ');
                
                return `((context) => {
                    const result = ${objStr};
                    ${spreadChecks}
                    ${spreadAssigns}
                    ${exclusions.length > 0 ? `[${exclusionStr}].forEach(key => delete result[key]);` : ''}
                    return result;
                })`;
            } else {
                // No spreads or exclusions - return regular object literal
                const regularProperties = propArray.filter(prop => typeof prop === 'string' && prop.trim() !== '');
                const objectSpec = VisitorUtils.createObjectLiteral(regularProperties);
                return objectSpec;
            }
        }
        return '{}';
    },

    aggregationPropertyList(ctx) {
        // Get individual property strings instead of joining them
        if (!ctx.aggregationProperty) return [];
        return ctx.aggregationProperty.map(prop => this.visit(prop));
    },

    aggregationProperty(ctx) {
        if (ctx.spreadAll) {
            throw new Error('spreadAll ("...*") is not supported in summarize aggregation. Use explicit identifiers like ...window or ...w instead.');
        } else if (ctx.spreadExpression) {
            // For spread expressions in aggregations, handle context objects
            // We need to get the raw identifier, not the safeGet expression
            let expr = this._extractIdentifierFromExpression(ctx.spreadExpression[0]);
            if (!expr) {
                // Fallback to visiting the expression
                expr = this.visit(ctx.spreadExpression);
            }
            return `...${expr}`;
        } else if (ctx.excludeField) {
            // Handle exclusion field with clean object structure
            const fieldName = VisitorUtils.getTokenImage(ctx.excludeField);
            return { type: 'exclusion', field: fieldName };
        } else if (ctx.propertyKey && ctx.aggregationExpression) {
            const key = this.visit(ctx.propertyKey);
            const value = this.visit(ctx.aggregationExpression);
            return `${key}: ${value}`;
        } else if (ctx.shorthandProperty) {
            const identifier = VisitorUtils.getTokenImage(ctx.shorthandProperty);
            return `${identifier}: new AggregationExpression('safeGet', ['${identifier}'])`;
        }
        return '';
    },

    /**
     * Extract raw identifier from expression structure
     */
    _extractIdentifierFromExpression(ctx) {
        if (!ctx) return null;
        
        // If it's a token with image, return the image
        if (ctx.image) {
            return ctx.image;
        }
        
        // If it has children, recursively search for identifier
        if (ctx.children) {
            // Look for identifier in primaryExpression
            if (ctx.children.primaryExpression) {
                const primary = ctx.children.primaryExpression[0];
                if (primary && primary.children && primary.children.identifier) {
                    const identifier = primary.children.identifier[0];
                    if (identifier && identifier.image) {
                        return identifier.image;
                    }
                }
            }
            
            // Recursively search through all children
            for (const [key, children] of Object.entries(ctx.children)) {
                if (Array.isArray(children) && children.length > 0) {
                    const result = this._extractIdentifierFromExpression(children[0]);
                    if (result) return result;
                }
            }
        }
        
        return null;
    },

    aggregationExpression(ctx) {
        // Convert any expression to AggregationExpression
        if (ctx.aggregationFunctionCall) {
            return this.visit(ctx.aggregationFunctionCall);
        } else if (ctx.expression) {
            return this.buildAggregationExpression(ctx.expression);
        }
        return '';
    },

    /**
     * Build an AggregationExpression from any expression context
     */
    buildAggregationExpression(ctx) {
        // Handle case where ctx is an array (common in CST)
        if (Array.isArray(ctx)) {
            ctx = ctx[0];
        }
        
        return this._convertExpressionToAggregationExpression(ctx);
    },

    /**
     * Recursively convert expression context to AggregationExpression constructor call
     */
    _convertExpressionToAggregationExpression(ctx) {
        if (!ctx) return 'null';

        // Handle case where ctx is a token (has image property but no children)
        if (ctx.image && !ctx.children) {
            return `new AggregationExpression('safeGet', ['${ctx.image}'])`;
        }

        // Navigate directly through the CST to properly handle binary operations
        return this._convertCSTToAggregationExpression(ctx);
    },

    _convertCSTToAggregationExpression(ctx) {
        if (!ctx || !ctx.children) return 'null';

        // Handle binary operations FIRST before navigating down
        if (ctx.name === 'arithmeticExpression' && ctx.children.termExpression && ctx.children.termExpression.length > 1) {
            return this._handleArithmeticBinaryOp(ctx);
        }

        // Handle binary operations at term level  
        if (ctx.name === 'termExpression' && ctx.children.primaryExpression && ctx.children.primaryExpression.length > 1) {
            return this._handleTermBinaryOp(ctx);
        }

        // Navigate through expression hierarchy
        if (ctx.children.ternaryExpression) {
            return this._convertCSTToAggregationExpression(ctx.children.ternaryExpression[0]);
        }
        if (ctx.children.orExpression) {
            return this._convertCSTToAggregationExpression(ctx.children.orExpression[0]);
        }
        if (ctx.children.andExpression) {
            return this._convertCSTToAggregationExpression(ctx.children.andExpression[0]);
        }
        if (ctx.children.comparisonExpression) {
            return this._convertCSTToAggregationExpression(ctx.children.comparisonExpression[0]);
        }
        if (ctx.children.arithmeticExpression) {
            return this._convertCSTToAggregationExpression(ctx.children.arithmeticExpression[0]);
        }
        if (ctx.children.termExpression) {
            return this._convertCSTToAggregationExpression(ctx.children.termExpression[0]);
        }

        if (ctx.children.primaryExpression) {
            return this._convertCSTToAggregationExpression(ctx.children.primaryExpression[0]);
        }
        if (ctx.children.atomicExpression) {
            return this._convertCSTToAggregationExpression(ctx.children.atomicExpression[0]);
        }

        // Handle literals directly from atomic expressions
        if (ctx.children.NumberLiteral) {
            return ctx.children.NumberLiteral[0].image;
        }
        if (ctx.children.BooleanLiteral) {
            return ctx.children.BooleanLiteral[0].image.toLowerCase();
        }
        if (ctx.children.StringLiteral) {
            return ctx.children.StringLiteral[0].image;
        }
        if (ctx.children.NullLiteral) {
            return 'null';
        }

        // Handle function calls
        if (ctx.children.functionCall) {
            const funcCall = ctx.children.functionCall[0];
            if (funcCall.children && funcCall.children.scalarFunction) {
                const scalarFunc = funcCall.children.scalarFunction[0];
                const funcName = this._getFunctionName(scalarFunc);
                
                const args = [];
                if (scalarFunc.children && scalarFunc.children.argumentList) {
                    const argList = scalarFunc.children.argumentList[0];
                    if (argList.children && argList.children.expression) {
                        for (const argCtx of argList.children.expression) {
                            args.push(this._convertCSTToAggregationExpression(argCtx));
                        }
                    }
                }
                
                return `new AggregationExpression('${funcName}', [${args.join(', ')}])`;
            }
        }

        // Handle stepVariable -> stepOrVariable -> identifier  
        if (ctx.children.stepVariable) {
            return this._convertCSTToAggregationExpression(ctx.children.stepVariable[0]);
        }
        if (ctx.children.stepOrVariable) {
            // stepOrVariable is actually the token itself, not a CST node
            const token = ctx.children.stepOrVariable[0];
            if (token && token.image) {
                return `new AggregationExpression('safeGet', ['${token.image}'])`;
            }
            return this._convertCSTToAggregationExpression(token);
        }
        if (ctx.children.identifier) {
            const fieldName = ctx.children.identifier[0].image;
            return `new AggregationExpression('safeGet', ['${fieldName}'])`;
        }

        // Handle literals
        if (ctx.children.literal) {
            const literalValue = this.visit(ctx.children.literal[0]);
            return literalValue;
        }

        return 'null';
    },

    _handleArithmeticBinaryOp(ctx) {
        // Handle + and - operations
        const terms = ctx.children.termExpression || [];
        const operators = [];
        
        // Collect operators
        if (ctx.children.Plus) operators.push(...ctx.children.Plus.map(() => 'add'));
        if (ctx.children.Minus) operators.push(...ctx.children.Minus.map(() => 'sub'));

        if (terms.length === 1) {
            return this._convertCSTToAggregationExpression(terms[0]);
        }

        // Build nested binary operations
        let result = this._convertCSTToAggregationExpression(terms[0]);
        for (let i = 1; i < terms.length; i++) {
            const operator = operators[i - 1] || 'add';
            const nextTerm = this._convertCSTToAggregationExpression(terms[i]);
            result = `new AggregationExpression('${operator}', [${result}, ${nextTerm}])`;
        }
        
        return result;
    },

    _handleTermBinaryOp(ctx) {
        // Handle * and / operations
        const primaries = ctx.children.primaryExpression || [];
        const operators = [];
        
        // Collect operators
        if (ctx.children.Multiply) operators.push(...ctx.children.Multiply.map(() => 'mul'));
        if (ctx.children.Divide) operators.push(...ctx.children.Divide.map(() => 'div'));

        if (primaries.length === 1) {
            return this._convertCSTToAggregationExpression(primaries[0]);
        }

        // Build nested binary operations
        let result = this._convertCSTToAggregationExpression(primaries[0]);
        for (let i = 1; i < primaries.length; i++) {
            const operator = operators[i - 1] || 'mul';
            const nextTerm = this._convertCSTToAggregationExpression(primaries[i]);
            result = `new AggregationExpression('${operator}', [${result}, ${nextTerm}])`;
        }
        
        return result;
    },

    /**
     * Handle binary operations like +, -, *, /
     */
    _handleBinaryOperation(ctx) {
        // This is a simplified handler - you'd need to implement proper binary operation parsing
        // For now, return a placeholder
        return 'new AggregationExpression("add", [])'; // placeholder
    },

    /**
     * Get function name from scalar function context
     */
    _getFunctionName(scalarFuncCtx) {
        if (scalarFuncCtx.children && scalarFuncCtx.children.functionName) {
            return scalarFuncCtx.children.functionName[0].image;
        }
        return 'unknown';
    },

    aggregationFunctionCall(ctx) {
        if (ctx.countFunction) {
            return this.visit(ctx.countFunction);
        } else if (ctx.sumFunction) {
            return this.visit(ctx.sumFunction);
        }
        return '';
    },

    countFunction(ctx) {
        return 'new AggregationExpression("count", [])';
    },

    sumFunction(ctx) {
        const valueExpression = this._convertExpressionToAggregationExpression(ctx.valueExpression[0]);
        return `new AggregationExpression("sum", [${valueExpression}])`;
    },

    byExpressionList(ctx) {
        // For now, just take the first expression
        const expression = this.visit(ctx.expression[0]);
        return expression;
    },


    /**
     * Visit an expression in state context (for aggregations)
     * This treats bare identifiers as state variables instead of item properties
     */
    visitWithStateContext(ctx) {
        // Save the original stepVariable method
        const originalStepVariable = this.stepVariable;
        
        // Override stepVariable to use proper context access in aggregations
        this.stepVariable = (ctx) => {
            const stepOrVariable = VisitorUtils.getTokenImage(ctx.stepOrVariable);
            
            if (ctx.variableName) {
                const variableName = VisitorUtils.getTokenImage(ctx.variableName);
                return `safeGet(context, '${stepOrVariable}.${variableName}')`;
            } else {
                return `safeGet(context, '${stepOrVariable}')`;
            }
        };
        
        try {
            // Visit the expression with the modified context
            const result = this.visit(ctx);
            return result;
        } finally {
            // Restore the original stepVariable method
            this.stepVariable = originalStepVariable;
        }
    },

    // =============================================================================
    // EMIT CLAUSE VISITORS
    // =============================================================================
    
    emitClause(ctx) {
        if (ctx.emitEvery) {
            return this.visit(ctx.emitEvery);
        } else if (ctx.emitWhen) {
            return this.visit(ctx.emitWhen);
        } else if (ctx.emitOnChange) {
            return this.visit(ctx.emitOnChange);
        } else if (ctx.emitOnGroupChange) {
            return this.visit(ctx.emitOnGroupChange);
        } else if (ctx.emitOnUpdate) {
            return this.visit(ctx.emitOnUpdate);
        }
        return 'null';
    },

    emitEvery(ctx) {
        const interval = this.visit(ctx.interval);
        if (ctx.valueExpression) {
            const valueExpr = this.visit(ctx.valueExpression);
            return `Operators.emit_every(${interval}, (item) => ${valueExpr})`;
        } else {
            return `Operators.emit_every(${interval})`;
        }
    },

    emitWhen(ctx) {
        const condition = this.visit(ctx.condition);
        return `Operators.emit_when((item) => ${condition})`;
    },

    emitOnChange(ctx) {
        const valueExpr = this.visit(ctx.valueExpression);
        return `Operators.emit_on_change((item) => ${valueExpr})`;
    },

    emitOnGroupChange(ctx) {
        return `Operators.emit_on_group_change()`;
    },

    emitOnUpdate(ctx) {
        return `Operators.emit_on_update()`;
    },

    // =============================================================================
    // SCAN CLAUSE
    // =============================================================================

    scanClause(ctx) {
        const steps = this.visit(ctx.stepList);
        return `.pipe(new Operators.ScanOperator()${steps})`;
    },

    stepList(ctx) {
        const stepDefinitions = VisitorUtils.visitArray(this, ctx.stepDefinition, '');
        return stepDefinitions;
    },

    stepDefinition(ctx) {
        const stepName = VisitorUtils.getTokenImage(ctx.stepName);
        
        // Set step name context for this step
        this._currentStepNames = [stepName];
        
        const condition = this.visit(ctx.stepCondition);
        const statements = this.visit(ctx.statementList);
        
        // Clear context
        this._currentStepNames = null;
        
        // Check if there's an emit() call in the statements
        const statementsStr = typeof statements === 'string' ? statements : String(statements);
        const hasEmit = statementsStr.includes('return ');
        
        let assignmentCode;
        if (hasEmit) {
            // Extract emit logic and other assignments
            const statementLines = statementsStr.split('\n                ').filter(s => s.trim());
            const emitStatement = statementLines.find(s => s.includes('return '));
            const otherStatements = statementLines.filter(s => !s.includes('return '));
            
            assignmentCode = `
            (state, item) => {
                if (!state.${stepName}) state.${stepName} = {};
                ${otherStatements.join('\n                ')}
                ${emitStatement || 'return null;'}
            }`;
        } else {
            // No emit, just condition and assignments
            assignmentCode = statementsStr.trim() 
                ? `
            (state, item) => {
                if (!state.${stepName}) state.${stepName} = {};
                ${statementsStr}
                return null;
            }`
                : 'null';
        }
        
        return `
        .addStep('${stepName}', 
            (state, item) => ${condition},${assignmentCode}
        )`;
    },

    stepCondition(ctx) {
        return this.visit(ctx.expression);
    },

    statementList(ctx) {
        return VisitorUtils.visitArray(this, ctx.statement, '\n                ');
    },

    statement(ctx) {
        if (ctx.assignmentStatement) {
            return this.visit(ctx.assignmentStatement);
        } else if (ctx.functionCallStatement) {
            return this.visit(ctx.functionCallStatement);
        }
        return '';
    },

    assignmentStatement(ctx) {
        // For assignments, we need to handle the left side differently
        // We can't assign to a function call like safeGet(item, 'field')
        const stepOrVariable = VisitorUtils.getTokenImage(ctx.stepVariable[0].children?.stepOrVariable || ctx.stepVariable[0].stepOrVariable);
        const variableName = ctx.stepVariable[0].children?.variableName ? 
            VisitorUtils.getTokenImage(ctx.stepVariable[0].children.variableName) : 
            (ctx.stepVariable[0].variableName ? VisitorUtils.getTokenImage(ctx.stepVariable[0].variableName) : null);
        
        let assignmentTarget;
        if (variableName) {
            // Check if this is a step name in scan context
            if (this._currentStepNames && this._currentStepNames.includes(stepOrVariable)) {
                // This is a step name - assign to state
                assignmentTarget = `state.${stepOrVariable}.${variableName}`;
            } else {
                // This is a field assignment - set on current item
                assignmentTarget = `item['${stepOrVariable}.${variableName}']`;
            }
        } else {
            // Check if this is a step name in scan context
            if (this._currentStepNames && this._currentStepNames.includes(stepOrVariable)) {
                // This is a step name - assign to state
                assignmentTarget = `state.${stepOrVariable}`;
            } else {
                // This is a simple field assignment
                assignmentTarget = `item['${stepOrVariable}']`;
            }
        }
        
        const value = this.visit(ctx.expression);
        return `${assignmentTarget} = ${value};`;
    },

    functionCallStatement(ctx) {
        const functionCall = this.visit(ctx.functionCall);
        return `${functionCall};`;
    },

    // =============================================================================
    // insert into, write to file, assert or save expected
    // =============================================================================

    insertIntoClause(ctx) {
        const targetStream = VisitorUtils.getTokenImage(ctx.targetStream);
        return `.pipe(insertIntoFactory('${targetStream}'))`;
    },

    writeToFileClause(ctx) {
        const filePath = this.visit(ctx.filePath);
        const options = ctx.options ? this.visit(ctx.options) : '{}';
        return `.pipe(new Operators.WriteToFile(${filePath}, ${options}))`;
    },

    assertOrSaveExpectedClause(ctx) {
        const filePath = this.visit(ctx.filePath);
        return `.pipe(new Operators.AssertOrSaveExpected(${filePath}))`;
    }

};