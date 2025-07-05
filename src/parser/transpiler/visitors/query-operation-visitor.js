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
            projectClause: () => this.visit(ctx.projectClause),
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
        if (!ctx.selectProperty || ctx.selectProperty.length === 0) {
            return VisitorUtils.createObjectLiteral([]);
        }

        const properties = [];
        
        // Handle spread syntax (...*)
        if (ctx.spreadAll) {
            properties.push('...item');
        }

        // Handle exclusions (-field)
        if (ctx.excludeField) {
            const excludeFields = ctx.excludeField.map(field => 
                VisitorUtils.getTokenImage(field)
            );
            // Note: Exclusion logic needs to be implemented in the Select operator
            // For now, we'll generate a comment
            properties.push(`/* exclude: ${excludeFields.join(', ')} */`);
        }

        // Handle regular properties
        const regularProperties = ctx.selectProperty.map(prop => this.visit(prop));
        properties.push(...regularProperties);

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
    // PROJECT CLAUSE (Legacy - prefer SELECT)
    // =============================================================================

    projectClause(ctx) {
        if (ctx.objectLiteral) {
            // Object literal syntax: project {id: id, newField: expression}
            const objectCode = this.visit(ctx.objectLiteral);
            return `.pipe(new Operators.Map(item => (${objectCode})))`;
        } else if (ctx.columnList) {
            // Simple column list: project id, name, email
            const columns = this.visit(ctx.columnList);
            return `.pipe(new Operators.Map(item => (${VisitorUtils.createObjectLiteral(columns)})))`;
        }
        return '';
    },

    columnList(ctx) {
        return VisitorUtils.visitArray(this, ctx.column);
    },

    column(ctx) {
        const columnName = VisitorUtils.getTokenImage(ctx.Identifier);
        return `${columnName}: ${VisitorUtils.createSafeAccess('item', columnName)}`;
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
        let windowName = "'window'";
        if (ctx.windowDefinition) {
            const windowDef = this.visit(ctx.windowDefinition);
            windowSpec = windowDef.spec;
            windowName = `'${windowDef.name}'`;
        }
        
        return `.pipe(Operators.createSummarizeOperator(${aggregationObject}, ${groupByCallback}, ${windowSpec}, ${windowName}))`;
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