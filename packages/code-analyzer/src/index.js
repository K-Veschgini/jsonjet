import * as acorn from 'acorn';

/**
 * Extracts external function call names from JavaScript code
 * @param {string} code - JavaScript code to analyze
 * @returns {string[]} Array of external function call names
 */
export function extractExternalFunctionCalls(code) {
    try {
        const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
        const functionCalls = new Set();
        const definedFunctions = new Set();
        
        // First pass: collect all function declarations and expressions
        collectDefinedFunctions(ast, definedFunctions);
        
        // Second pass: collect external function calls
        collectFunctionCalls(ast, functionCalls, definedFunctions);
        
        return Array.from(functionCalls).sort();
    } catch (error) {
        throw new Error(`Failed to parse code: ${error.message}`);
    }
}

function collectDefinedFunctions(node, definedFunctions) {
    if (!node) return;
    
    // Function declarations
    if (node.type === 'FunctionDeclaration' && node.id) {
        definedFunctions.add(node.id.name);
    }
    
    // Function expressions with names
    if (node.type === 'FunctionExpression' && node.id) {
        definedFunctions.add(node.id.name);
    }
    
    // Arrow functions assigned to variables
    if (node.type === 'VariableDeclarator' && 
        node.init && 
        (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression') &&
        node.id && node.id.type === 'Identifier') {
        definedFunctions.add(node.id.name);
    }
    
    // Method definitions in objects/classes
    if (node.type === 'MethodDefinition' && node.key && node.key.type === 'Identifier') {
        definedFunctions.add(node.key.name);
    }
    
    // Property with function value
    if (node.type === 'Property' && 
        node.key && node.key.type === 'Identifier' &&
        node.value && (node.value.type === 'FunctionExpression' || node.value.type === 'ArrowFunctionExpression')) {
        definedFunctions.add(node.key.name);
    }
    
    // Recursively process child nodes
    for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
                node[key].forEach(child => collectDefinedFunctions(child, definedFunctions));
            } else {
                collectDefinedFunctions(node[key], definedFunctions);
            }
        }
    }
}

function collectFunctionCalls(node, functionCalls, definedFunctions) {
    if (!node) return;
    
    // Function calls
    if (node.type === 'CallExpression') {
        const callee = node.callee;
        
        // Direct function calls: f()
        if (callee.type === 'Identifier') {
            const functionName = callee.name;
            if (!definedFunctions.has(functionName)) {
                functionCalls.add(functionName);
            }
        }
        
        // Method calls: obj.f() - only if not computed
        if (callee.type === 'MemberExpression' && 
            callee.property && 
            callee.property.type === 'Identifier' &&
            !callee.computed) {
            const functionName = callee.property.name;
            if (!definedFunctions.has(functionName)) {
                functionCalls.add(functionName);
            }
        }
        
        // Computed property calls: obj['f']() - SECURITY RISK
        if (callee.type === 'MemberExpression' && 
            callee.property && 
            callee.property.type === 'Literal' &&
            typeof callee.property.value === 'string' &&
            callee.computed) {
            functionCalls.add('[DYNAMIC_CALL]');
        }
        
        // Dynamic property access: obj[expr]() - HIGH SECURITY RISK
        if (callee.type === 'MemberExpression' && 
            callee.property && 
            callee.property.type !== 'Identifier' &&
            callee.property.type !== 'Literal' &&
            callee.computed) {
            functionCalls.add('[DYNAMIC_CALL]');
        }
        
        // Computed property access with identifier: obj[var]() - also security risk
        if (callee.type === 'MemberExpression' && 
            callee.property && 
            callee.property.type === 'Identifier' &&
            callee.computed) {
            functionCalls.add('[DYNAMIC_CALL]');
        }
        

    }
    
    // Recursively process child nodes
    for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
                node[key].forEach(child => collectFunctionCalls(child, functionCalls, definedFunctions));
            } else {
                // Handle dynamic property access in call expressions
                if (node.type === 'CallExpression' && 
                    node.callee && 
                    node.callee.type === 'MemberExpression' && 
                    node.callee.property && 
                    node.callee.property.type !== 'Identifier' &&
                    node.callee.property.type !== 'Literal' &&
                    key === 'callee') {
                    // Process the object part
                    if (node[key].object) {
                        collectFunctionCalls(node[key].object, functionCalls, definedFunctions);
                    }
                    // Process the property expression (which might contain function calls)
                    if (node[key].property) {
                        collectFunctionCalls(node[key].property, functionCalls, definedFunctions);
                    }
                    continue;
                }
                

                collectFunctionCalls(node[key], functionCalls, definedFunctions);
            }
        }
    }
} 