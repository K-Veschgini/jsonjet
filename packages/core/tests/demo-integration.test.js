import { describe, it, expect, beforeEach } from 'bun:test';
import { createInstances } from '../src/instances.js';
import CommandParser from '../src/parser/command-parser.js';

// Import all demos from demo package
import { flowProcessingDemo } from '../../demo/src/demos/flow-processing.js';
import { summarizeDemo } from '../../demo/src/demos/summarize-demo.js';
import { scanDemo } from '../../demo/src/demos/scan-demo.js';
import { selectDemo } from '../../demo/src/demos/select-demo.js';

describe('Demo Integration Tests', () => {
  let streamManager;
  let queryEngine;
  
  beforeEach(() => {
    const instances = createInstances();
    streamManager = instances.streamManager;
    queryEngine = instances.queryEngine;
  });

  // Helper function to parse statements from demo content
  const parseStatements = (content) => {
    if (!content) return [];
    
    const lines = content.split('\n');
    const statements = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('//')) {
        continue;
      }
      
      // Look for statements (create, insert, delete, flush, list, info, subscribe, unsubscribe, or query pipelines)
      if (/^(create|insert|delete|flush|list|info|subscribe|unsubscribe|[a-zA-Z_][a-zA-Z0-9_]*\s*\|)/.test(line)) {
        let currentStatement = line;
        let currentLine = i;
        
        // Handle multi-line statements
        if (!line.endsWith(';')) {
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            
            if (!nextLine || nextLine.startsWith('//')) {
              break;
            }
            
            currentStatement += ' ' + nextLine;
            
            if (nextLine.endsWith(';') || isCompleteStatement(currentStatement)) {
              i = j;
              break;
            }
          }
        }
        
        if (isCompleteStatement(currentStatement)) {
          const trimmed = currentStatement.replace(/;$/, '').trim();
          const isCommand = /^(create\s+(?:or\s+replace\s+|if\s+not\s+exists\s+)?stream|insert\s+into|delete\s+(stream|flow)|flush|list|info|subscribe|unsubscribe)\b/.test(trimmed);
          const isFlow = /^create\s+flow\b/.test(trimmed);
          
          statements.push({
            text: trimmed,
            line: currentLine,
            isCommand: isCommand && !isFlow,
            isQuery: isFlow || (!isCommand && trimmed.length > 0),
          });
        }
      }
    }
    
    return statements;
  };

  // Helper function to check if statement is complete
  const isCompleteStatement = (stmt) => {
    const trimmed = stmt.trim();
    
    if (!trimmed) return false;
    
    let braceCount = 0;
    let bracketCount = 0; 
    let parenCount = 0;
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let escapeNext = false;
    
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }
      
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      
      if (inDoubleQuote || inSingleQuote) continue;
      
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--; 
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
    }
    
    return trimmed.endsWith(';') && 
           braceCount === 0 && 
           bracketCount === 0 && 
           parenCount === 0;
  };

  // Helper function to execute a single statement
  const executeStatement = async (statement) => {
    if (statement.isCommand) {
      return await CommandParser.executeCommand(statement.text, streamManager);
    } else if (statement.isQuery) {
      return await queryEngine.executeStatement(statement.text);
    }
    return { success: false, message: 'Unknown statement type' };
  };

  // Helper function to run all statements in a demo
  const runDemo = async (demoContent, demoName) => {
    console.log(`\n=== Running ${demoName} Demo ===`);
    
    const statements = parseStatements(demoContent);
    console.log(`Found ${statements.length} statements to execute`);
    
    const results = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}: ${statement.text}`);
      
      try {
        const result = await executeStatement(statement);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ Success: ${result.message}`);
        } else {
          console.log(`❌ Failed: ${result.message}`);
        }
        
        // Small delay between statements
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        console.log(`💥 Error: ${error.message}`);
        results.push({ success: false, message: error.message });
      }
    }
    
    return { statements, results };
  };

  it('should run flow processing demo without errors', async () => {
    const { statements, results } = await runDemo(flowProcessingDemo, 'Flow Processing');
    
    // All statements should parse
    expect(statements.length).toBeGreaterThan(0);
    
    // Most statements should succeed (some might fail due to missing streams, but syntax should be valid)
    const parseErrors = results.filter(r => !r.success && r.message.includes('Parse errors'));
    expect(parseErrors.length).toBe(0);
  });

  it('should run summarize demo without errors', async () => {
    const { statements, results } = await runDemo(summarizeDemo, 'Summarize');
    
    expect(statements.length).toBeGreaterThan(0);
    
    const parseErrors = results.filter(r => !r.success && r.message.includes('Parse errors'));
    expect(parseErrors.length).toBe(0);
  });

  it('should run scan demo without errors', async () => {
    const { statements, results } = await runDemo(scanDemo, 'Scan');
    
    expect(statements.length).toBeGreaterThan(0);
    
    const parseErrors = results.filter(r => !r.success && r.message.includes('Parse errors'));
    expect(parseErrors.length).toBe(0);
  });

  it('should run select demo without errors', async () => {
    const { statements, results } = await runDemo(selectDemo, 'Select');
    
    expect(statements.length).toBeGreaterThan(0);
    
    // This is the main test - select demo should have no parse errors
    const parseErrors = results.filter(r => !r.success && r.message.includes('Parse errors'));
    if (parseErrors.length > 0) {
      console.log('Parse errors found:');
      parseErrors.forEach(error => console.log('  -', error.message));
    }
    expect(parseErrors.length).toBe(0);
    
    // Check for specific syntax issues
    const syntaxErrors = results.filter(r => !r.success && (
      r.message.includes('Unexpected token') || 
      r.message.includes('Lexing errors') ||
      r.message.includes('Transpilation failed')
    ));
    if (syntaxErrors.length > 0) {
      console.log('Syntax errors found:');
      syntaxErrors.forEach(error => console.log('  -', error.message));
    }
    expect(syntaxErrors.length).toBe(0);
  });
});