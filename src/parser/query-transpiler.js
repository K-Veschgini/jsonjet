import { parseQuery, QueryParser } from './query-parser.js';

// Create parser instance to get the base visitor constructor
const parserInstance = new QueryParser();
const BaseCstVisitor = parserInstance.getBaseCstVisitorConstructor();

// Create a visitor class to traverse the CST and generate JavaScript code
class QueryTranspiler extends BaseCstVisitor {
    constructor() {
        super();
        // This helper will detect any missing or redundant visitor methods
        this.validateVisitor();
    }

    // Main query transpilation
    query(ctx) {
        if (ctx.command) {
            // Handle commands (.print, .help, etc.)
            return this.visit(ctx.command);
        } else {
            // Handle regular query pipeline
            let jsCode = '';
            
            // Start with the source
            const sourceName = this.visit(ctx.source);
            jsCode = '';
            
            // Add pipe operations
            if (ctx.operation) {
                for (const operation of ctx.operation) {
                    const operationCode = this.visit(operation);
                    jsCode += operationCode;
                }
            }
            
            return jsCode;
        }
    }

    // Command transpilation
    command(ctx) {
        if (ctx.printCommand) {
            return this.visit(ctx.printCommand);
        }
        // Future: handle other commands like .help, .describe, etc.
        return '';
    }

    // Print command transpilation
    printCommand(ctx) {
        const expression = this.visit(ctx.expression);
        return `console.log(${expression})`;
    }

    // Source (data source name)
    source(ctx) {
        return ctx.sourceName[0].image;
    }

    // Operations after pipe
    operation(ctx) {
        if (ctx.whereClause) {
            return this.visit(ctx.whereClause);
        } else if (ctx.projectClause) {
            return this.visit(ctx.projectClause);
        } else if (ctx.scanClause) {
            return this.visit(ctx.scanClause);
        } else if (ctx.summarizeClause) {
            return this.visit(ctx.summarizeClause);
        } else if (ctx.collectClause) {
            return this.visit(ctx.collectClause);
        }
        return '';
    }

    // WHERE clause transpilation
    whereClause(ctx) {
        const condition = this.visit(ctx.expression);
        return `.pipe(new Operators.Filter(item => ${condition}))`;
    }

    // PROJECT clause transpilation
    projectClause(ctx) {
        const columns = this.visit(ctx.columnList);
        return `.pipe(new Operators.Map(item => ({ ${columns} })))`;
    }

    // Column list for project
    columnList(ctx) {
        const columns = ctx.column.map(col => this.visit(col));
        return columns.join(', ');
    }

    // Column reference
    column(ctx) {
        const columnName = ctx.Identifier[0].image;
        return `${columnName}: item.${columnName}`;
    }

    // Expression handling
    expression(ctx) {
        let result = this.visit(ctx.andExpression[0]);
        
        if (ctx.andExpression.length > 1) {
            for (let i = 1; i < ctx.andExpression.length; i++) {
                const rightExpr = this.visit(ctx.andExpression[i]);
                result = `(${result}) || (${rightExpr})`;
            }
        }
        
        return result;
    }

    andExpression(ctx) {
        let result = this.visit(ctx.comparisonExpression[0]);
        
        if (ctx.comparisonExpression.length > 1) {
            for (let i = 1; i < ctx.comparisonExpression.length; i++) {
                const rightExpr = this.visit(ctx.comparisonExpression[i]);
                result = `(${result}) && (${rightExpr})`;
            }
        }
        
        return result;
    }

    comparisonExpression(ctx) {
        const left = this.visit(ctx.arithmeticExpression[0]);
        
        if (ctx.arithmeticExpression.length === 1) {
            return left;
        }
        
        const right = this.visit(ctx.arithmeticExpression[1]);
        let operator = '';
        
        if (ctx.Equals) {
            operator = '===';
        } else if (ctx.NotEquals) {
            operator = '!==';
        } else if (ctx.LessThan) {
            operator = '<';
        } else if (ctx.GreaterThan) {
            operator = '>';
        } else if (ctx.LessEquals) {
            operator = '<=';
        } else if (ctx.GreaterEquals) {
            operator = '>=';
        }
        
        return `${left} ${operator} ${right}`;
    }

    arithmeticExpression(ctx) {
        let result = this.visit(ctx.termExpression[0]);
        
        for (let i = 1; i < ctx.termExpression.length; i++) {
            const right = this.visit(ctx.termExpression[i]);
            let operator = '';
            
            if (ctx.Plus && ctx.Plus[i-1]) {
                operator = '+';
            } else if (ctx.Minus && ctx.Minus[i-1]) {
                operator = '-';
            }
            
            result = `${result} ${operator} ${right}`;
        }
        
        return result;
    }

    termExpression(ctx) {
        let result = this.visit(ctx.primaryExpression[0]);
        
        for (let i = 1; i < ctx.primaryExpression.length; i++) {
            const right = this.visit(ctx.primaryExpression[i]);
            let operator = '';
            
            if (ctx.Multiply && ctx.Multiply[i-1]) {
                operator = '*';
            } else if (ctx.Divide && ctx.Divide[i-1]) {
                operator = '/';
            }
            
            result = `${result} ${operator} ${right}`;
        }
        
        return result;
    }

    primaryExpression(ctx) {
        if (ctx.functionCall) {
            return this.visit(ctx.functionCall);
        } else if (ctx.objectLiteral) {
            return this.visit(ctx.objectLiteral);
        } else if (ctx.stepVariable) {
            return this.visit(ctx.stepVariable);
        } else if (ctx.StringLiteral) {
            return ctx.StringLiteral[0].image;
        } else if (ctx.NumberLiteral) {
            return ctx.NumberLiteral[0].image;
        } else if (ctx.BooleanLiteral) {
            return ctx.BooleanLiteral[0].image.toLowerCase();
        } else if (ctx.expression) {
            // Parenthesized expression
            return `(${this.visit(ctx.expression)})`;
        }
        
        return '';
    }

    // Object literal transpilation
    objectLiteral(ctx) {
        if (ctx.propertyList) {
            const properties = this.visit(ctx.propertyList);
            return `{ ${properties} }`;
        } else {
            return '{}';
        }
    }

    // Property list transpilation
    propertyList(ctx) {
        const properties = ctx.property.map(prop => this.visit(prop));
        return properties.join(', ');
    }

    // Property transpilation
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
            // Shorthand: identifier becomes key: item.identifier
            const identifier = ctx.shorthandProperty[0].image;
            return `${identifier}: item.${identifier}`;
        }
        
        return '';
    }

    // Property key transpilation
    propertyKey(ctx) {
        if (ctx.Identifier) {
            return ctx.Identifier[0].image;
        } else if (ctx.StringLiteral) {
            return ctx.StringLiteral[0].image;
        } else if (ctx.Where) {
            return 'where';
        } else if (ctx.Project) {
            return 'project';
        } else if (ctx.Scan) {
            return 'scan';
        } else if (ctx.Step) {
            return 'step';
        } else if (ctx.And) {
            return 'and';
        } else if (ctx.Or) {
            return 'or';
        } else if (ctx.Iff) {
            return 'iff';
        } else if (ctx.Emit) {
            return 'emit';
        } else if (ctx.Collect) {
            return 'collect';
        } else if (ctx.Count) {
            return 'count';
        } else if (ctx.Sum) {
            return 'sum';
        }
        
        return '';
    }

    // Function calls
    functionCall(ctx) {
        if (ctx.iffFunction) {
            return this.visit(ctx.iffFunction);
        } else if (ctx.emitFunction) {
            return this.visit(ctx.emitFunction);
        }
        return '';
    }

    // IFF function transpilation
    iffFunction(ctx) {
        const condition = this.visit(ctx.condition);
        const trueValue = this.visit(ctx.trueValue);
        const falseValue = this.visit(ctx.falseValue);
        
        return `(${condition} ? ${trueValue} : ${falseValue})`;
    }

    // EMIT function transpilation
    emitFunction(ctx) {
        if (ctx.argumentList) {
            const args = this.visit(ctx.argumentList);
            // Emit only takes a single argument, so use it directly
            return `return ${args}`;
        } else {
            return `return null`;
        }
    }

    // Argument list transpilation
    argumentList(ctx) {
        const args = ctx.expression.map(expr => this.visit(expr));
        return args.join(', ');
    }

    // SCAN clause transpilation
    scanClause(ctx) {
        const steps = this.visit(ctx.stepList);
        
        // Generate scan implementation using ScanOperator
        return `.pipe(new Operators.ScanOperator()${steps})`;
    }

    // SUMMARIZE clause transpilation
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
    }

    // Aggregation object transpilation
    aggregationObject(ctx) {
        if (ctx.aggregationPropertyList) {
            const properties = this.visit(ctx.aggregationPropertyList);
            return `{ ${properties} }`;
        } else {
            return '{}';
        }
    }

    // Aggregation property list transpilation
    aggregationPropertyList(ctx) {
        const properties = ctx.aggregationProperty.map(prop => this.visit(prop));
        return properties.join(', ');
    }

    // Aggregation property transpilation
    aggregationProperty(ctx) {
        if (ctx.spreadAll) {
            return '...item';
        } else if (ctx.propertyKey && ctx.aggregationExpression) {
            const key = this.visit(ctx.propertyKey);
            const value = this.visit(ctx.aggregationExpression);
            return `${key}: ${value}`;
        } else if (ctx.shorthandProperty) {
            const identifier = ctx.shorthandProperty[0].image;
            return `${identifier}: ${identifier}`;
        }
        return '';
    }

    // Aggregation expression transpilation
    aggregationExpression(ctx) {
        if (ctx.aggregationFunctionCall) {
            return this.visit(ctx.aggregationFunctionCall);
        } else if (ctx.expression) {
            return this.visit(ctx.expression);
        }
        return '';
    }

    // Aggregation function call transpilation
    aggregationFunctionCall(ctx) {
        if (ctx.countFunction) {
            return this.visit(ctx.countFunction);
        } else if (ctx.sumFunction) {
            return this.visit(ctx.sumFunction);
        }
        return '';
    }

    // Count function transpilation
    countFunction(ctx) {
        return 'Operators.count()';
    }

    // Sum function transpilation
    sumFunction(ctx) {
        const valueExpression = this.visit(ctx.valueExpression);
        return `Operators.sum((item) => ${valueExpression})`;
    }

    // BY expression list transpilation
    byExpressionList(ctx) {
        // For now, just take the first expression and make sure it uses item
        const expression = this.visit(ctx.expression[0]);
        return expression;
    }

    // Window definition transpilation
    windowDefinition(ctx) {
        const windowName = ctx.windowName[0].image;
        const windowFunc = this.visit(ctx.windowFunctionCall);
        return {
            name: windowName,
            spec: windowFunc
        };
    }

    // Window function call transpilation
    windowFunctionCall(ctx) {
        if (ctx.hoppingWindowFunction) {
            return this.visit(ctx.hoppingWindowFunction);
        } else if (ctx.tumblingWindowFunction) {
            return this.visit(ctx.tumblingWindowFunction);
        } else if (ctx.sessionWindowFunction) {
            return this.visit(ctx.sessionWindowFunction);
        }
        return 'null';
    }

    // Hopping window function transpilation
    hoppingWindowFunction(ctx) {
        const size = this.visit(ctx.size);
        const hop = this.visit(ctx.hop);
        const timeField = ctx.timeField ? this.visit(ctx.timeField) : 'null';
        return `Operators.hopping_window(${size}, ${hop}, ${timeField})`;
    }

    // Tumbling window function transpilation
    tumblingWindowFunction(ctx) {
        const size = this.visit(ctx.size);
        const timeField = ctx.timeField ? this.visit(ctx.timeField) : 'null';
        return `Operators.tumbling_window(${size}, ${timeField})`;
    }

    // Session window function transpilation
    sessionWindowFunction(ctx) {
        const timeout = this.visit(ctx.timeout);
        const timeField = this.visit(ctx.timeField);
        return `Operators.session_window(${timeout}, ${timeField})`;
    }

    // COLLECT clause transpilation - prints results as they come
    collectClause(ctx) {
        return `.collect(result => console.log(result))`;
    }

    // Step list transpilation
    stepList(ctx) {
        const stepDefinitions = ctx.stepDefinition.map(step => this.visit(step));
        return stepDefinitions.join('');
    }

    // Step definition transpilation
    stepDefinition(ctx) {
        const stepName = ctx.stepName[0].image;
        const condition = this.visit(ctx.stepCondition);
        const statements = this.visit(ctx.statementList);
        
        // Check if there's an emit() call in the statements
        const hasEmit = statements.includes('return ');
        
        if (hasEmit) {
            // Extract the emit logic and other assignments
            const statementLines = statements.split('\n                ').filter(s => s.trim());
            const emitStatement = statementLines.find(s => s.includes('return '));
            const otherStatements = statementLines.filter(s => !s.includes('return '));
            
            // Build assignment function
            let assignmentCode = '';
            if (otherStatements.length > 0 || emitStatement) {
                assignmentCode = `
            (state, row) => {
                if (!state.${stepName}) state.${stepName} = {};
                ${otherStatements.join('\n                ')}
                ${emitStatement || 'return null;'}
            }`;
            } else {
                assignmentCode = 'null';
            }
            
            return `
        .addStep('${stepName}', 
            (state, row) => ${condition},${assignmentCode}
        )`;
        } else {
            // No emit, just condition and assignments
            let assignmentCode = '';
            if (statements.trim()) {
                assignmentCode = `
            (state, row) => {
                if (!state.${stepName}) state.${stepName} = {};
                ${statements}
                return null;
            }`;
            } else {
                assignmentCode = 'null';
            }
            
            return `
        .addStep('${stepName}', 
            (state, row) => ${condition},${assignmentCode}
        )`;
        }
    }

    // Step condition transpilation
    stepCondition(ctx) {
        return this.visit(ctx.expression);
    }

    // Statement list transpilation
    statementList(ctx) {
        const statements = ctx.statement.map(statement => this.visit(statement));
        return statements.join('\n                ');
    }

    // Statement transpilation
    statement(ctx) {
        if (ctx.assignmentStatement) {
            return this.visit(ctx.assignmentStatement);
        } else if (ctx.functionCallStatement) {
            return this.visit(ctx.functionCallStatement);
        }
        return '';
    }

    // Assignment statement transpilation
    assignmentStatement(ctx) {
        const variable = this.visit(ctx.stepVariable);
        const value = this.visit(ctx.expression);
        
        return `${variable} = ${value};`;
    }

    // Function call statement transpilation
    functionCallStatement(ctx) {
        const functionCall = this.visit(ctx.functionCall);
        return `${functionCall};`;
    }

    // Step variable transpilation
    stepVariable(ctx) {
        const stepOrVariable = ctx.stepOrVariable[0].image;
        
        if (ctx.variableName) {
            // This is stepName.variableName - access from state
            const variableName = ctx.variableName[0].image;
            return `state.${stepOrVariable}.${variableName}`;
        } else {
            // This is just variableName - access from item (not row for consistency)
            return `item.${stepOrVariable}`;
        }
    }
}

// Create transpiler instance
const transpilerInstance = new QueryTranspiler();

// Main transpilation function
export function transpileQuery(queryText) {
    try {
        // Parse the query first
        const parseResult = parseQuery(queryText);
        
        if (parseResult.parseErrors.length > 0) {
            throw new Error(`Parse errors: ${parseResult.parseErrors.map(e => e.message).join(', ')}`);
        }
        
        // Transpile the CST to JavaScript
        const jsCode = transpilerInstance.visit(parseResult.cst);
        
        // Import all operators from index
        const imports = `import * as Operators from './src/operators/index.js';`;
        
        return {
            javascript: jsCode,
            imports: imports,
            cst: parseResult.cst,
            tokens: parseResult.tokens
        };
        
    } catch (error) {
        throw new Error(`Transpilation failed: ${error.message}`);
    }
}

// Helper function to create executable JavaScript function
export function createQueryFunction(queryText) {
    const result = transpileQuery(queryText);
    
    // Every query uses streaming infrastructure since sources are always streams
    return {
        execute: async function(data) {
            // Import all modules
            const { Stream } = await import('../core/stream.js');
            const Operators = await import('../operators/index.js');
            
            // The pipeline code should just be the operations
            let pipelineCode = result.javascript;
            
            // Create execution context with imports available
            const createPipeline = new Function('Stream', 'Operators', `
                return new Stream()${pipelineCode};
            `);
            
            const stream = createPipeline(Stream, Operators);
            
            // Push data through the stream
            for (const item of data) {
                stream.push(item);
            }
            
            // Wait for all processing to complete
            await stream.finish();
        },
        javascript: result.javascript,
        originalQuery: queryText
    };
}

// Export transpiler class for advanced usage
export { QueryTranspiler }; 