# TODO: Add LOOKUP Definition Capabilities to JSDB

## Overview
Add support for defining lookups using syntax like:
- `create lookup x = ...`
- `create or replace lookup x = ...`

Where the RHS can be: bool, int, float, string, null, array, or object.

## Required Changes

### 1. Token System (`packages/core/src/parser/tokens/`)

#### 1.1 Add LOOKUP Token (`keyword-tokens.js`)
- [ ] Add `Lookup` token: `export const Lookup = createToken({ name: "Lookup", pattern: /lookup\b/i });`
- [ ] Add to token registry exports in `token-registry.js`
- [ ] Add to `allTokens` array in correct position (after other statement keywords)

### 2. Grammar Rules (`packages/core/src/parser/rules/`)

#### 2.1 Update Core Rules (`core-rules.js`)
- [ ] Add `createLookupStatement` rule to handle `create [or replace] lookup <name> = <expression>`
- [ ] Update `programStatement` to include the new lookup creation rule
- [ ] Update `createStatement` to include lookup creation as an alternative to stream/flow

#### 2.2 Grammar Structure
```javascript
this.createLookupStatement = this.RULE("createLookupStatement", () => {
    this.CONSUME(Create);
    this.OPTION(() => {
        this.CONSUME(Or);
        this.CONSUME(Replace);
    });
    this.CONSUME(Lookup);
    this.CONSUME(Identifier, { LABEL: "lookupName" });
    this.CONSUME(Assign);
    this.SUBRULE(this.expression, { LABEL: "lookupValue" });
});
```

### 3. Registry System (`packages/core/src/core/registry.js`)

#### 3.1 Extend Registry Class
- [ ] Add `lookups` Map to store lookup name -> value mappings
- [ ] Add `registerLookup(name, value)` method
- [ ] Add `getLookup(name)` method
- [ ] Add `hasLookup(name)` method
- [ ] Add `updateLookup(name, value)` method for "or replace" functionality
- [ ] Add `getLookupNames()` method for listing
- [ ] Add validation to prevent name conflicts with functions, aggregations, operators

#### 3.2 Lookup Management
- [ ] Add lookup validation (check for reserved names, valid identifiers)
- [ ] Add lookup value validation (ensure it's a supported type)
- [ ] Add lookup lifecycle management (creation, replacement, deletion)

### 4. Command Parser (`packages/core/src/parser/command-parser.js`)

#### 4.1 Update Command Parser
- [ ] Add `handleCreateLookupCommand` method
- [ ] Update `handleCreateCommand` to route to lookup creation
- [ ] Add lookup creation logic with "or replace" and "if not exists" support
- [ ] Add lookup validation and error handling

#### 4.2 Command Structure
```javascript
static async handleCreateLookupCommand(args, sm, registry) {
    // Parse: create [or replace] lookup <name> = <value>
    // Validate lookup name
    // Parse and validate lookup value
    // Register in registry
    // Return success/error response
}
```

### 5. Query Engine (`packages/core/src/core/query-engine.js`)

#### 5.1 Update Query Engine
- [ ] Add lookup handling to `executeStatement` method
- [ ] Add `handleCreateLookup` method
- [ ] Update `executeCommand` to handle lookup creation AST
- [ ] Ensure lookups are available in flow execution context

### 6. Transpiler System (`packages/core/src/parser/transpiler/`)

#### 6.1 Update Command Visitor (`visitors/command-visitor.js`)
- [ ] Add `createLookupStatement` visitor method
- [ ] Handle lookup creation AST generation
- [ ] Support "or replace" modifier

#### 6.2 Update Unified Command Visitor (`visitors/unified-command-visitor.js`)
- [ ] Add lookup creation to `createStatement` method
- [ ] Generate proper AST for lookup creation

### 7. Expression System (`packages/core/src/parser/transpiler/visitors/`)

#### 7.1 Update Expression Visitor (`expression-visitor.js`)
- [ ] Add lookup resolution in `stepVariable` or `atomicExpression`
- [ ] Ensure lookups can be referenced in expressions
- [ ] Add lookup resolution logic

#### 7.2 Lookup Resolution
- [ ] Add lookup resolution in expression evaluation
- [ ] Handle lookup references in flow queries
- [ ] Ensure lookups are available in all execution contexts

### 8. Flow Execution Context

#### 8.1 Update Flow Pipeline Creation (`query-engine.js`)
- [ ] Modify `createFlowPipeline` to include lookup context
- [ ] Ensure lookups are available in flow execution
- [ ] Add lookup injection into execution scope

#### 8.2 Execution Context
- [ ] Update pipeline execution to include lookup registry
- [ ] Ensure lookups are accessible in all pipeline operations
- [ ] Add lookup resolution in safeGet and other access functions

### 9. Error Handling

#### 9.1 Add Lookup-Specific Errors (`core/jsdb-error.js`)
- [ ] Add `LOOKUP_DEFINITION_ERROR` error code
- [ ] Add `LOOKUP_NOT_FOUND` error code
- [ ] Add `LOOKUP_NAME_CONFLICT` error code
- [ ] Add `LOOKUP_VALUE_ERROR` error code

#### 9.2 Validation
- [ ] Add lookup name validation (reserved words, valid identifiers)
- [ ] Add lookup value validation (supported types)
- [ ] Add conflict detection with existing functions/operators

### 10. Testing

#### 10.1 Add Test Cases (`packages/core/tests/`)
- [ ] Create `lookup-definition.test.js`
- [ ] Test lookup creation with various value types
- [ ] Test "or replace" functionality
- [ ] Test lookup usage in flows
- [ ] Test error cases (invalid names, conflicts, etc.)
- [ ] Test lookup resolution in expressions

#### 10.2 Test Scenarios
- [ ] Basic lookup creation: `create lookup x = 42`
- [ ] String lookups: `create lookup name = "test"`
- [ ] Boolean lookups: `create lookup enabled = true`
- [ ] Array lookups: `create lookup items = [1, 2, 3]`
- [ ] Object lookups: `create lookup config = { timeout: 5000 }`
- [ ] Null lookups: `create lookup empty = null`
- [ ] Replace existing: `create or replace lookup x = 100`
- [ ] Usage in flows: `create flow test as stream | where x > my_lookup`

### 11. Documentation

#### 11.1 Update Documentation
- [ ] Add lookup definition syntax to grammar documentation
- [ ] Add examples of lookup usage
- [ ] Document lookup lifecycle and scoping
- [ ] Add lookup best practices

### 12. UI Updates (Optional)

#### 12.1 Code Editor (`packages/ui/src/components/`)
- [ ] Update `CodeEditor.jsx` to recognize lookup creation syntax
- [ ] Add syntax highlighting for lookup keywords
- [ ] Update statement detection logic

### 13. Integration Points

#### 13.1 Registry Integration
- [ ] Ensure lookups are loaded with other registry components
- [ ] Add lookup persistence if needed
- [ ] Handle lookup cleanup on system shutdown

#### 13.2 Query Context
- [ ] Make lookups available in all query execution contexts
- [ ] Ensure lookups are accessible in pipeline operations
- [ ] Add lookup resolution to expression evaluation

## Implementation Priority

1. **High Priority**: Token system, grammar rules, registry extension
2. **Medium Priority**: Command parser, query engine integration
3. **Low Priority**: UI updates, advanced features

## Notes

- Lookups should be globally scoped and available across all flows
- Lookup names should follow the same identifier rules as other names
- Lookups should be immutable once created (except via "or replace")
- Lookups should be resolved at parse time when possible for performance
- Consider adding lookup listing/deletion commands for management 