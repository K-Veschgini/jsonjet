import { createToken, Lexer, CstParser } from 'chevrotain';

// Define tokens
const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /\s+/,
    group: Lexer.SKIPPED
});

const Comment = createToken({
    name: "Comment",
    pattern: /\/\/[^\r\n]*/,
    group: Lexer.SKIPPED
});

// Keywords
const Where = createToken({ name: "Where", pattern: /where/i });
const Project = createToken({ name: "Project", pattern: /project/i });
const Select = createToken({ name: "Select", pattern: /select/i });
const Scan = createToken({ name: "Scan", pattern: /scan/i });
const Step = createToken({ name: "Step", pattern: /step/i });
const Summarize = createToken({ name: "Summarize", pattern: /summarize/i });
const InsertInto = createToken({ name: "InsertInto", pattern: /insert_into/i });
const By = createToken({ name: "By", pattern: /by/i });
const Over = createToken({ name: "Over", pattern: /over/i });
const And = createToken({ name: "And", pattern: /and/i });
const Or = createToken({ name: "Or", pattern: /or/i });

// Functions
const Iff = createToken({ name: "Iff", pattern: /iff/i });
const Emit = createToken({ name: "Emit", pattern: /emit/i });
const Collect = createToken({ name: "Collect", pattern: /collect/i });
const Print = createToken({ name: "Print", pattern: /\.print/i });

// Aggregation functions
const Count = createToken({ name: "Count", pattern: /count\b/i });
const Sum = createToken({ name: "Sum", pattern: /sum\b/i });

// Window functions
const HoppingWindow = createToken({ name: "HoppingWindow", pattern: /hopping_window/i });
const TumblingWindow = createToken({ name: "TumblingWindow", pattern: /tumbling_window/i });
const SessionWindow = createToken({ name: "SessionWindow", pattern: /session_window/i });

// Operators
const Pipe = createToken({ name: "Pipe", pattern: /\|/ });
const Arrow = createToken({ name: "Arrow", pattern: /=>/ });
const Assign = createToken({ name: "Assign", pattern: /=/ });
const Equals = createToken({ name: "Equals", pattern: /==/ });
const NotEquals = createToken({ name: "NotEquals", pattern: /!=/ });
const LessThan = createToken({ name: "LessThan", pattern: /</ });
const GreaterThan = createToken({ name: "GreaterThan", pattern: />/ });
const LessEquals = createToken({ name: "LessEquals", pattern: /<=/ });
const GreaterEquals = createToken({ name: "GreaterEquals", pattern: />=/ });
const LogicalOr = createToken({ name: "LogicalOr", pattern: /\|\|/ });
const LogicalAnd = createToken({ name: "LogicalAnd", pattern: /&&/ });
const Plus = createToken({ name: "Plus", pattern: /\+/ });
const Minus = createToken({ name: "Minus", pattern: /-/ });
const Multiply = createToken({ name: "Multiply", pattern: /\*/ });
const Divide = createToken({ name: "Divide", pattern: /\// });

// Literals
const StringLiteral = createToken({
    name: "StringLiteral",
    pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/
});

const NumberLiteral = createToken({
    name: "NumberLiteral",
    pattern: /\d+(?:\.\d+)?/
});

const BooleanLiteral = createToken({
    name: "BooleanLiteral",
    pattern: /true|false/i
});

const NullLiteral = createToken({
    name: "NullLiteral",
    pattern: /null\b/i
});

// Identifiers (must come after keywords)
const Identifier = createToken({
    name: "Identifier",
    pattern: /[a-zA-Z_][a-zA-Z0-9_]*/
});

// Punctuation
const Comma = createToken({ name: "Comma", pattern: /,/ });
const Semicolon = createToken({ name: "Semicolon", pattern: /;/ });
const Colon = createToken({ name: "Colon", pattern: /:/ });
const Dot = createToken({ name: "Dot", pattern: /\./ });
const Spread = createToken({ name: "Spread", pattern: /\.\.\./ });
const LeftParen = createToken({ name: "LeftParen", pattern: /\(/ });
const RightParen = createToken({ name: "RightParen", pattern: /\)/ });
const LeftBrace = createToken({ name: "LeftBrace", pattern: /\{/ });
const RightBrace = createToken({ name: "RightBrace", pattern: /\}/ });
const LeftBracket = createToken({ name: "LeftBracket", pattern: /\[/ });
const RightBracket = createToken({ name: "RightBracket", pattern: /\]/ });

// Token array - order matters!
const allTokens = [
    WhiteSpace,
    Comment,
    // Keywords and functions first (longer patterns first)
    HoppingWindow, TumblingWindow, SessionWindow,
    Where, Project, Select, Scan, Step, Summarize, InsertInto, By, Over, And, Or, Iff, Emit, Collect, Print,
    Count, Sum,
    // Operators (longer patterns first)
    LogicalOr, LogicalAnd, Arrow, Equals, NotEquals, LessEquals, GreaterEquals, LessThan, GreaterThan, Assign, Pipe, Plus, Minus, Multiply, Divide, Spread,
    // Literals
    StringLiteral, NumberLiteral, BooleanLiteral, NullLiteral,
    // Identifiers last (after keywords)
    Identifier,
    // Punctuation
    Comma, Semicolon, Colon, Dot, LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket
];

// Create lexer
const QueryLexer = new Lexer(allTokens);

// Parser class
class QueryParser extends CstParser {
    constructor() {
        super(allTokens);
        this.performSelfAnalysis();
    }

    // Main query rule - now supports semicolon termination
    query = this.RULE("query", () => {
        this.OR([
            // Dot commands (.create, .insert, etc.)
            { ALT: () => this.SUBRULE(this.dotCommand) },
            // Print commands (.print expression)
            { ALT: () => this.SUBRULE(this.command) },
            // Regular query pipeline
            { ALT: () => {
                this.SUBRULE(this.source);
                this.MANY(() => {
                    this.CONSUME(Pipe);
                    this.SUBRULE(this.operation);
                });
                // Optional semicolon termination for queries
                this.OPTION(() => {
                    this.CONSUME(Semicolon);
                });
            }}
        ]);
    });

    // Dot commands (.create, .insert, etc.)
    dotCommand = this.RULE("dotCommand", () => {
        this.CONSUME(Dot);
        this.CONSUME(Identifier, { LABEL: "commandName" });
        this.MANY(() => {
            this.SUBRULE(this.commandArgument);
        });
        // Optional semicolon termination for commands
        this.OPTION(() => {
            this.CONSUME(Semicolon);
        });
    });

    // Command arguments (identifiers, strings, JSON objects)
    commandArgument = this.RULE("commandArgument", () => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.SUBRULE(this.objectLiteral) },
            { ALT: () => this.SUBRULE(this.arrayLiteral) },
            { ALT: () => this.CONSUME(NumberLiteral) }
        ]);
    });

    // Print commands (.print expression)
    command = this.RULE("command", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.printCommand) }
            // Future commands: .help, .describe, .schema, etc.
        ]);
    });

    // Print command (.print expression)
    printCommand = this.RULE("printCommand", () => {
        this.CONSUME(Print);
        this.SUBRULE(this.expression);
    });

    // Source (data source name)
    source = this.RULE("source", () => {
        this.CONSUME(Identifier, { LABEL: "sourceName" });
    });

    // Operations after pipe
    operation = this.RULE("operation", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.whereClause) },
            { ALT: () => this.SUBRULE(this.projectClause) },
            { ALT: () => this.SUBRULE(this.selectClause) },
            { ALT: () => this.SUBRULE(this.scanClause) },
            { ALT: () => this.SUBRULE(this.summarizeClause) },
            { ALT: () => this.SUBRULE(this.insertIntoClause) },
            { ALT: () => this.SUBRULE(this.collectClause) }
        ]);
    });

    // WHERE clause
    whereClause = this.RULE("whereClause", () => {
        this.CONSUME(Where);
        this.SUBRULE(this.expression);
    });

    // PROJECT clause
    projectClause = this.RULE("projectClause", () => {
        this.CONSUME(Project);
        this.OR([
            // Object literal syntax: project {id: id, newField: expression}
            { ALT: () => this.SUBRULE(this.objectLiteral) },
            // Simple column list: project id, name, email
            { ALT: () => this.SUBRULE(this.columnList) }
        ]);
    });

    // SELECT clause - modern syntax with spread and exclusions
    selectClause = this.RULE("selectClause", () => {
        this.CONSUME(Select);
        this.SUBRULE(this.selectObject);
    });

    // Select object with spread and exclusions: { ...*, field: expr, -excludeField }
    selectObject = this.RULE("selectObject", () => {
        this.CONSUME(LeftBrace);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => {
                this.OR([
                    // Spread all: ...*
                    { ALT: () => {
                        this.CONSUME(Spread);
                        this.CONSUME(Multiply, { LABEL: "spreadAll" });
                    }},
                    // Exclusion: -fieldName
                    { ALT: () => {
                        this.CONSUME(Minus, { LABEL: "exclusion" });
                        this.CONSUME(Identifier, { LABEL: "excludeField" });
                    }},
                    // Regular property
                    { ALT: () => this.SUBRULE(this.selectProperty) }
                ]);
            }
        });
        this.CONSUME(RightBrace);
    });

    // Select property: field, field: expr, or shorthand
    selectProperty = this.RULE("selectProperty", () => {
        this.OR([
            // Key-value pair: key: value
            { ALT: () => {
                this.SUBRULE(this.propertyKey);
                this.CONSUME(Colon);
                this.SUBRULE(this.expression, { LABEL: "propertyValue" });
            }},
            // Shorthand property: identifier
            { ALT: () => {
                this.CONSUME(Identifier, { LABEL: "shorthandProperty" });
            }}
        ]);
    });

    // Column list for project
    columnList = this.RULE("columnList", () => {
        this.SUBRULE(this.column);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.column);
        });
    });

    // Column reference
    column = this.RULE("column", () => {
        this.CONSUME(Identifier);
    });

    // SCAN clause
    scanClause = this.RULE("scanClause", () => {
        this.CONSUME(Scan);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.stepList);
        this.CONSUME(RightParen);
    });

    // SUMMARIZE clause
    summarizeClause = this.RULE("summarizeClause", () => {
        this.CONSUME(Summarize);
        this.SUBRULE(this.aggregationObject);
        this.OPTION(() => {
            this.CONSUME(By);
            this.SUBRULE(this.byExpressionList);
        });
        this.OPTION2(() => {
            this.CONSUME(Over);
            this.SUBRULE(this.windowDefinition);
        });
    });

    // Aggregation object: {count: count(), total: sum('amount'), ...}
    aggregationObject = this.RULE("aggregationObject", () => {
        this.CONSUME(LeftBrace);
        this.OPTION(() => {
            this.SUBRULE(this.aggregationPropertyList);
        });
        this.CONSUME(RightBrace);
    });

    // Aggregation property list
    aggregationPropertyList = this.RULE("aggregationPropertyList", () => {
        this.SUBRULE(this.aggregationProperty);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.aggregationProperty);
        });
    });

    // Individual aggregation property
    aggregationProperty = this.RULE("aggregationProperty", () => {
        this.OR([
            // Spread syntax: ...*
            { ALT: () => {
                this.CONSUME(Spread);
                this.CONSUME(Multiply, { LABEL: "spreadAll" });
            }},
            // Key-value pair: key: aggregationFunction()
            { ALT: () => {
                this.SUBRULE(this.propertyKey);
                this.CONSUME(Colon);
                this.SUBRULE(this.aggregationExpression);
            }},
            // Shorthand: just identifier
            { ALT: () => {
                this.CONSUME(Identifier, { LABEL: "shorthandProperty" });
            }}
        ]);
    });

    // Aggregation expression (function call or value)
    aggregationExpression = this.RULE("aggregationExpression", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.aggregationFunctionCall) },
            { ALT: () => this.SUBRULE(this.expression) }
        ]);
    });

    // Aggregation function calls
    aggregationFunctionCall = this.RULE("aggregationFunctionCall", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.countFunction) },
            { ALT: () => this.SUBRULE(this.sumFunction) }
        ]);
    });

    // Individual aggregation functions
    countFunction = this.RULE("countFunction", () => {
        this.CONSUME(Count);
        this.CONSUME(LeftParen);
        this.CONSUME(RightParen);
    });

    sumFunction = this.RULE("sumFunction", () => {
        this.CONSUME(Sum);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "valueExpression" });
        this.OPTION(() => {
            this.CONSUME(Comma);
            this.SUBRULE(this.objectLiteral, { LABEL: "options" });
        });
        this.CONSUME(RightParen);
    });

    // BY expression list
    byExpressionList = this.RULE("byExpressionList", () => {
        this.SUBRULE(this.expression);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.expression);
        });
    });

    // Window definition: window = hopping_window(...)
    windowDefinition = this.RULE("windowDefinition", () => {
        this.CONSUME(Identifier, { LABEL: "windowName" });
        this.CONSUME(Assign);
        this.SUBRULE(this.windowFunctionCall);
    });

    // Window function calls
    windowFunctionCall = this.RULE("windowFunctionCall", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.hoppingWindowFunction) },
            { ALT: () => this.SUBRULE(this.tumblingWindowFunction) },
            { ALT: () => this.SUBRULE(this.sessionWindowFunction) }
        ]);
    });

    hoppingWindowFunction = this.RULE("hoppingWindowFunction", () => {
        this.CONSUME(HoppingWindow);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "size" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression, { LABEL: "hop" });
        this.OPTION(() => {
            this.CONSUME2(Comma);
            this.SUBRULE3(this.expression, { LABEL: "timeField" });
        });
        this.CONSUME(RightParen);
    });

    tumblingWindowFunction = this.RULE("tumblingWindowFunction", () => {
        this.CONSUME(TumblingWindow);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "size" });
        this.OPTION(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.expression, { LABEL: "timeField" });
        });
        this.CONSUME(RightParen);
    });

    sessionWindowFunction = this.RULE("sessionWindowFunction", () => {
        this.CONSUME(SessionWindow);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "timeout" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression, { LABEL: "timeField" });
        this.CONSUME(RightParen);
    });

    // INSERT_INTO clause
    insertIntoClause = this.RULE("insertIntoClause", () => {
        this.CONSUME(InsertInto);
        this.CONSUME(LeftParen);
        this.CONSUME(Identifier, { LABEL: "targetStream" });
        this.CONSUME(RightParen);
    });

    // COLLECT clause
    collectClause = this.RULE("collectClause", () => {
        this.CONSUME(Collect);
        this.CONSUME(LeftParen);
        this.CONSUME(RightParen);
    });

    // List of step definitions
    stepList = this.RULE("stepList", () => {
        this.SUBRULE(this.stepDefinition);
        this.MANY(() => {
            this.SUBRULE2(this.stepDefinition);
        });
    });

    // Individual step definition
    stepDefinition = this.RULE("stepDefinition", () => {
        this.CONSUME(Step);
        this.CONSUME(Identifier, { LABEL: "stepName" });
        this.CONSUME(Colon);
        this.SUBRULE(this.stepCondition);
        this.CONSUME(Arrow);
        this.SUBRULE(this.statementList);
        this.CONSUME(Semicolon);
    });

    // Step condition (boolean expression)
    stepCondition = this.RULE("stepCondition", () => {
        this.SUBRULE(this.expression);
    });

    // Statement list (comma-separated statements)
    statementList = this.RULE("statementList", () => {
        this.SUBRULE(this.statement);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.statement);
        });
    });

    // Individual statement (assignment or function call)
    statement = this.RULE("statement", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.assignmentStatement) },
            { ALT: () => this.SUBRULE(this.functionCallStatement) }
        ]);
    });

    // Assignment statement
    assignmentStatement = this.RULE("assignmentStatement", () => {
        this.SUBRULE(this.stepVariable);
        this.CONSUME(Assign);
        this.SUBRULE(this.expression);
    });

    // Function call statement (like emit())
    functionCallStatement = this.RULE("functionCallStatement", () => {
        this.SUBRULE(this.functionCall);
    });

    // Step variable (can be stepName.variableName or just variableName)
    stepVariable = this.RULE("stepVariable", () => {
        this.CONSUME(Identifier, { LABEL: "stepOrVariable" });
        this.OPTION(() => {
            this.CONSUME(Dot);
            this.CONSUME2(Identifier, { LABEL: "variableName" });
        });
    });

    // Expressions for WHERE conditions
    expression = this.RULE("expression", () => {
        this.SUBRULE(this.andExpression);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(Or) },
                { ALT: () => this.CONSUME(LogicalOr) }
            ]);
            this.SUBRULE2(this.andExpression);
        });
    });

    andExpression = this.RULE("andExpression", () => {
        this.SUBRULE(this.comparisonExpression);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(And) },
                { ALT: () => this.CONSUME(LogicalAnd) }
            ]);
            this.SUBRULE2(this.comparisonExpression);
        });
    });

    comparisonExpression = this.RULE("comparisonExpression", () => {
        this.SUBRULE(this.arithmeticExpression);
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Equals) },
                { ALT: () => this.CONSUME(NotEquals) },
                { ALT: () => this.CONSUME(LessThan) },
                { ALT: () => this.CONSUME(GreaterThan) },
                { ALT: () => this.CONSUME(LessEquals) },
                { ALT: () => this.CONSUME(GreaterEquals) }
            ]);
            this.SUBRULE2(this.arithmeticExpression);
        });
    });

    arithmeticExpression = this.RULE("arithmeticExpression", () => {
        this.SUBRULE(this.termExpression);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(Plus) },
                { ALT: () => this.CONSUME(Minus) }
            ]);
            this.SUBRULE2(this.termExpression);
        });
    });

    termExpression = this.RULE("termExpression", () => {
        this.SUBRULE(this.primaryExpression);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(Multiply) },
                { ALT: () => this.CONSUME(Divide) }
            ]);
            this.SUBRULE2(this.primaryExpression);
        });
    });

    primaryExpression = this.RULE("primaryExpression", () => {
        this.SUBRULE(this.atomicExpression);
        this.MANY(() => {
            this.OR([
                // Array access: expr[index]
                { ALT: () => {
                    this.CONSUME(LeftBracket);
                    this.SUBRULE(this.expression, { LABEL: "index" });
                    this.CONSUME(RightBracket);
                }},
                // Property access: expr.property
                { ALT: () => {
                    this.CONSUME(Dot);
                    this.CONSUME(Identifier, { LABEL: "property" });
                }}
            ]);
        });
    });

    // Atomic expressions (without member access)
    atomicExpression = this.RULE("atomicExpression", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.functionCall) },
            { ALT: () => this.SUBRULE(this.objectLiteral) },
            { ALT: () => this.SUBRULE(this.arrayLiteral) },
            { ALT: () => this.SUBRULE(this.stepVariable) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(NumberLiteral) },
            { ALT: () => this.CONSUME(BooleanLiteral) },
            { ALT: () => this.CONSUME(NullLiteral) },
            { ALT: () => {
                this.CONSUME(LeftParen);
                this.SUBRULE(this.expression);
                this.CONSUME(RightParen);
            }}
        ]);
    });

    // Object literal: {key: value, ...other}
    objectLiteral = this.RULE("objectLiteral", () => {
        this.CONSUME(LeftBrace);
        this.OPTION(() => {
            this.SUBRULE(this.propertyList);
        });
        this.CONSUME(RightBrace);
    });

    // Array literal: [value1, value2, ...]
    arrayLiteral = this.RULE("arrayLiteral", () => {
        this.CONSUME(LeftBracket);
        this.OPTION(() => {
            this.SUBRULE(this.elementList);
        });
        this.CONSUME(RightBracket);
    });

    // Element list for array literals
    elementList = this.RULE("elementList", () => {
        this.SUBRULE(this.expression);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.expression);
        });
    });

    // Property list for object literals
    propertyList = this.RULE("propertyList", () => {
        this.SUBRULE(this.property);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.property);
        });
    });

    // Individual property: key: value, shorthand, or spread
    property = this.RULE("property", () => {
        this.OR([
            // Spread syntax: ...expr
            { ALT: () => {
                this.CONSUME(Spread);
                this.SUBRULE(this.expression, { LABEL: "spreadExpression" });
            }},
            // Key-value pair: key: value
            { ALT: () => {
                this.SUBRULE(this.propertyKey);
                this.CONSUME(Colon);
                this.SUBRULE2(this.expression, { LABEL: "propertyValue" });
            }},
            // Shorthand: just identifier (becomes key: key)
            { ALT: () => {
                this.CONSUME(Identifier, { LABEL: "shorthandProperty" });
            }}
        ]);
    });

    // Property key: identifier, string literal, or keywords
    propertyKey = this.RULE("propertyKey", () => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(StringLiteral) },
            // Allow keywords as property names
            { ALT: () => this.CONSUME(Where) },
            { ALT: () => this.CONSUME(Project) },
            { ALT: () => this.CONSUME(Scan) },
            { ALT: () => this.CONSUME(Step) },
            { ALT: () => this.CONSUME(InsertInto) },
            { ALT: () => this.CONSUME(And) },
            { ALT: () => this.CONSUME(Or) },
            { ALT: () => this.CONSUME(Iff) },
            { ALT: () => this.CONSUME(Emit) },
            { ALT: () => this.CONSUME(Collect) },
            { ALT: () => this.CONSUME(Count) },
            { ALT: () => this.CONSUME(Sum) }
        ]);
    });

    // Function calls
    functionCall = this.RULE("functionCall", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.iffFunction) },
            { ALT: () => this.SUBRULE(this.emitFunction) }
        ]);
    });

    // IFF function: iff(condition, value_if_true, value_if_false)
    iffFunction = this.RULE("iffFunction", () => {
        this.CONSUME(Iff);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "condition" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression, { LABEL: "trueValue" });
        this.CONSUME2(Comma);
        this.SUBRULE3(this.expression, { LABEL: "falseValue" });
        this.CONSUME(RightParen);
    });

    // EMIT function: emit(value)
    emitFunction = this.RULE("emitFunction", () => {
        this.CONSUME(Emit);
        this.CONSUME(LeftParen);
        this.OPTION(() => {
            this.SUBRULE(this.argumentList);
        });
        this.CONSUME(RightParen);
    });

    // Argument list for function calls
    argumentList = this.RULE("argumentList", () => {
        this.SUBRULE(this.expression);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.expression);
        });
    });
}

// Export function to parse queries - creates fresh parser each time for syntax changes
export function parseQuery(queryText) {
    const lexingResult = QueryLexer.tokenize(queryText);
    
    if (lexingResult.errors.length > 0) {
        throw new Error(`Lexing errors: ${lexingResult.errors.map(e => e.message).join(', ')}`);
    }

    // Create fresh parser instance to pick up any grammar changes
    const parserInstance = new QueryParser();
    parserInstance.input = lexingResult.tokens;
    const cst = parserInstance.query();

    if (parserInstance.errors.length > 0) {
        throw new Error(`Parsing errors: ${parserInstance.errors.map(e => e.message).join(', ')}`);
    }

    return {
        cst,
        tokens: lexingResult.tokens,
        lexErrors: lexingResult.errors,
        parseErrors: parserInstance.errors
    };
}

// Export tokens and parser for advanced usage
export { allTokens, QueryLexer, QueryParser }; 