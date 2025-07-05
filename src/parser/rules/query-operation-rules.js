// Query operation rules - WHERE, SELECT, PROJECT, SUMMARIZE, etc.
import { 
    Where, Project, Select, Scan, Summarize, InsertInto, Collect,
    By, Over, Step, Count, Sum, Assign, Arrow, Comma, Colon, Semicolon,
    LeftParen, RightParen, LeftBrace, RightBrace,
    Spread, Multiply, Minus, Identifier
} from '../tokens/token-registry.js';

export function defineQueryOperationRules() {
    // =============================================================================
    // WHERE CLAUSE
    // =============================================================================
    
    this.whereClause = this.RULE("whereClause", () => {
        this.CONSUME(Where);
        this.SUBRULE(this.expression);
    });

    // =============================================================================
    // PROJECT CLAUSE (legacy - prefer SELECT)
    // =============================================================================
    
    this.projectClause = this.RULE("projectClause", () => {
        this.CONSUME(Project);
        this.OR([
            // Object literal syntax: project {id: id, newField: expression}
            { ALT: () => this.SUBRULE(this.objectLiteral) },
            // Simple column list: project id, name, email
            { ALT: () => this.SUBRULE(this.columnList) }
        ]);
    });

    this.columnList = this.RULE("columnList", () => {
        this.SUBRULE(this.column);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.column);
        });
    });

    this.column = this.RULE("column", () => {
        this.CONSUME(Identifier);
    });

    // =============================================================================
    // SELECT CLAUSE (modern, clean syntax)
    // =============================================================================
    
    this.selectClause = this.RULE("selectClause", () => {
        this.CONSUME(Select);
        this.SUBRULE(this.selectObject);
    });

    // Select object: { ...*, field: expr, -excludeField }
    this.selectObject = this.RULE("selectObject", () => {
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
    this.selectProperty = this.RULE("selectProperty", () => {
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

    // =============================================================================
    // SUMMARIZE CLAUSE
    // =============================================================================
    
    this.summarizeClause = this.RULE("summarizeClause", () => {
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

    this.aggregationObject = this.RULE("aggregationObject", () => {
        this.CONSUME(LeftBrace);
        this.OPTION(() => {
            this.SUBRULE(this.aggregationPropertyList);
        });
        this.CONSUME(RightBrace);
    });

    this.aggregationPropertyList = this.RULE("aggregationPropertyList", () => {
        this.SUBRULE(this.aggregationProperty);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.aggregationProperty);
        });
    });

    this.aggregationProperty = this.RULE("aggregationProperty", () => {
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

    this.aggregationExpression = this.RULE("aggregationExpression", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.aggregationFunctionCall) },
            { ALT: () => this.SUBRULE(this.expression) }
        ]);
    });

    this.aggregationFunctionCall = this.RULE("aggregationFunctionCall", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.countFunction) },
            { ALT: () => this.SUBRULE(this.sumFunction) }
        ]);
    });

    this.countFunction = this.RULE("countFunction", () => {
        this.CONSUME(Count);
        this.CONSUME(LeftParen);
        this.CONSUME(RightParen);
    });

    this.sumFunction = this.RULE("sumFunction", () => {
        this.CONSUME(Sum);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "valueExpression" });
        this.OPTION(() => {
            this.CONSUME(Comma);
            this.SUBRULE(this.objectLiteral, { LABEL: "options" });
        });
        this.CONSUME(RightParen);
    });

    this.byExpressionList = this.RULE("byExpressionList", () => {
        this.SUBRULE(this.expression);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.expression);
        });
    });

    // =============================================================================
    // SCAN CLAUSE
    // =============================================================================
    
    this.scanClause = this.RULE("scanClause", () => {
        this.CONSUME(Scan);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.stepList);
        this.CONSUME(RightParen);
    });

    this.stepList = this.RULE("stepList", () => {
        this.SUBRULE(this.stepDefinition);
        this.MANY(() => {
            this.SUBRULE2(this.stepDefinition);
        });
    });

    this.stepDefinition = this.RULE("stepDefinition", () => {
        this.CONSUME(Step);
        this.CONSUME(Identifier, { LABEL: "stepName" });
        this.CONSUME(Colon);
        this.SUBRULE(this.stepCondition);
        this.CONSUME(Arrow);
        this.SUBRULE(this.statementList);
        this.CONSUME(Semicolon);
    });

    this.stepCondition = this.RULE("stepCondition", () => {
        this.SUBRULE(this.expression);
    });

    this.statementList = this.RULE("statementList", () => {
        this.SUBRULE(this.statement);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.statement);
        });
    });

    this.statement = this.RULE("statement", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.assignmentStatement) },
            { ALT: () => this.SUBRULE(this.functionCallStatement) }
        ]);
    });

    this.assignmentStatement = this.RULE("assignmentStatement", () => {
        this.SUBRULE(this.stepVariable);
        this.CONSUME(Assign);
        this.SUBRULE(this.expression);
    });

    this.functionCallStatement = this.RULE("functionCallStatement", () => {
        this.SUBRULE(this.functionCall);
    });

    // =============================================================================
    // INSERT_INTO AND COLLECT CLAUSES
    // =============================================================================
    
    this.insertIntoClause = this.RULE("insertIntoClause", () => {
        this.CONSUME(InsertInto);
        this.CONSUME(LeftParen);
        this.CONSUME(Identifier, { LABEL: "targetStream" });
        this.CONSUME(RightParen);
    });

    this.collectClause = this.RULE("collectClause", () => {
        this.CONSUME(Collect);
        this.CONSUME(LeftParen);
        this.CONSUME(RightParen);
    });
}