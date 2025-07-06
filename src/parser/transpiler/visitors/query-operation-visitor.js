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
            collectClause: () => this.visit(ctx.collectClause)
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
            return VisitorUtils.createObjectLiteral(properties);
        }
        return VisitorUtils.createObjectLiteral([]);
    },

    aggregationPropertyList(ctx) {
        return VisitorUtils.visitArray(this, ctx.aggregationProperty);
    },

    aggregationProperty(ctx) {
        if (ctx.spreadAll) {
            return '...item';
        } else if (ctx.propertyKey && ctx.aggregationExpression) {
            const key = this.visit(ctx.propertyKey);
            const value = this.visit(ctx.aggregationExpression);
            return `${key}: ${value}`;
        } else if (ctx.shorthandProperty) {
            const identifier = VisitorUtils.getTokenImage(ctx.shorthandProperty);
            return `${identifier}: ${identifier}`;
        }
        return '';
    },

    aggregationExpression(ctx) {
        if (ctx.aggregationFunctionCall) {
            return this.visit(ctx.aggregationFunctionCall);
        } else if (ctx.expression) {
            return this.visit(ctx.expression);
        }
        return '';
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
        return 'Operators.count()';
    },

    sumFunction(ctx) {
        const valueExpression = this.visit(ctx.valueExpression);
        let options = '{}';
        if (ctx.options) {
            options = this.visit(ctx.options);
        }
        return `Operators.sum((item) => ${valueExpression}, ${options})`;
    },

    byExpressionList(ctx) {
        // For now, just take the first expression
        const expression = this.visit(ctx.expression[0]);
        return expression;
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
        const condition = this.visit(ctx.stepCondition);
        const statements = this.visit(ctx.statementList);
        
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
            (state, row) => {
                if (!state.${stepName}) state.${stepName} = {};
                ${otherStatements.join('\n                ')}
                ${emitStatement || 'return null;'}
            }`;
        } else {
            // No emit, just condition and assignments
            assignmentCode = statementsStr.trim() 
                ? `
            (state, row) => {
                if (!state.${stepName}) state.${stepName} = {};
                ${statementsStr}
                return null;
            }`
                : 'null';
        }
        
        return `
        .addStep('${stepName}', 
            (state, row) => ${condition},${assignmentCode}
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
        const variable = this.visit(ctx.stepVariable);
        const value = this.visit(ctx.expression);
        return `${variable} = ${value};`;
    },

    functionCallStatement(ctx) {
        const functionCall = this.visit(ctx.functionCall);
        return `${functionCall};`;
    },

    // =============================================================================
    // INSERT_INTO AND COLLECT CLAUSES
    // =============================================================================

    insertIntoClause(ctx) {
        const targetStream = VisitorUtils.getTokenImage(ctx.targetStream);
        return `.pipe(insertIntoFactory('${targetStream}'))`;
    },

    collectClause(ctx) {
        return `.collect(result => console.log(result))`;
    }
};