// Query operation rules - WHERE, SELECT, PROJECT, SUMMARIZE, etc.
import { 
    Where, Select, Scan, Summarize, InsertInto, Collect,
    By, Over, Step, Emit, Every, When, On, Change, Group, Update, Using,
    Assign, Arrow, Comma, Colon, Semicolon,
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
                    // Spread expression: ...expr
                    { ALT: () => {
                        this.CONSUME2(Spread);
                        this.SUBRULE(this.expression, { LABEL: "spreadExpression" });
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
            this.OR([
                // Window clause
                { ALT: () => {
                    this.CONSUME(Over);
                    this.SUBRULE(this.windowDefinition);
                }},
                // Emit clause
                { ALT: () => {
                    this.SUBRULE(this.emitClause);
                }}
            ]);
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
            // Spread all: ...*
            { ALT: () => {
                this.CONSUME(Spread);
                this.CONSUME(Multiply, { LABEL: "spreadAll" });
            }},
            // Spread expression: ...expr
            { ALT: () => {
                this.CONSUME2(Spread);
                this.SUBRULE(this.expression, { LABEL: "spreadExpression" });
            }},
            // Exclusion: -fieldName
            { ALT: () => {
                this.CONSUME(Minus, { LABEL: "exclusion" });
                this.CONSUME(Identifier, { LABEL: "excludeField" });
            }},
            // Key-value pair: key: aggregationFunction()
            { ALT: () => {
                this.SUBRULE(this.propertyKey);
                this.CONSUME(Colon);
                this.SUBRULE(this.aggregationExpression);
            }},
            // Shorthand: just identifier
            { ALT: () => {
                this.CONSUME2(Identifier, { LABEL: "shorthandProperty" });
            }}
        ]);
    });

    this.aggregationExpression = this.RULE("aggregationExpression", () => {
        this.SUBRULE(this.expression);
    });

    this.byExpressionList = this.RULE("byExpressionList", () => {
        this.SUBRULE(this.expression);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.expression);
        });
    });

    // =============================================================================
    // EMIT CLAUSE (alternative to window clause)
    // =============================================================================
    
    this.emitClause = this.RULE("emitClause", () => {
        this.CONSUME(Emit);
        this.OR([
            // emit every N [using expression]
            { ALT: () => this.SUBRULE(this.emitEvery) },
            // emit when condition
            { ALT: () => this.SUBRULE(this.emitWhen) },
            // emit on change expression
            { ALT: () => this.SUBRULE(this.emitOnChange) },
            // emit on group change
            { ALT: () => this.SUBRULE(this.emitOnGroupChange) },
            // emit on update
            { ALT: () => this.SUBRULE(this.emitOnUpdate) }
        ]);
    });

    this.emitEvery = this.RULE("emitEvery", () => {
        this.CONSUME(Every);
        this.SUBRULE(this.expression, { LABEL: "interval" });
        this.OPTION(() => {
            this.CONSUME(Using);
            this.SUBRULE2(this.expression, { LABEL: "valueExpression" });
        });
    });

    this.emitWhen = this.RULE("emitWhen", () => {
        this.CONSUME(When);
        this.SUBRULE(this.expression, { LABEL: "condition" });
    });

    this.emitOnChange = this.RULE("emitOnChange", () => {
        this.CONSUME(On);
        this.CONSUME(Change);
        this.SUBRULE(this.expression, { LABEL: "valueExpression" });
    });

    this.emitOnGroupChange = this.RULE("emitOnGroupChange", () => {
        this.CONSUME(On);
        this.CONSUME(Group);
        this.CONSUME(Change);
    });

    this.emitOnUpdate = this.RULE("emitOnUpdate", () => {
        this.CONSUME(On);
        this.CONSUME(Update);
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
        this.OR([
            { ALT: () => this.CONSUME(Identifier, { LABEL: "stepName" }) },
            // Allow keywords as step names
            { ALT: () => this.CONSUME(Where, { LABEL: "stepName" }) },
            { ALT: () => this.CONSUME(Scan, { LABEL: "stepName" }) },
        ]);
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