import fs from 'fs';
import path from 'path';
import { StreamManager } from '../src/core/stream-manager.js';
import { QueryEngine } from '../src/core/query-engine.js';

/**
 * RDB Test Runner - Discovers and runs all .rdb query files in specified directories
 * Each .rdb file is executed with a fresh StreamManager and checked for errors in _log stream
 */
class RdbTestRunner {
    constructor(testDirectories = ['tests/rdb-tests']) {
        this.testDirectories = testDirectories;
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }

    /**
     * Recursively find all .rdb files in the specified directories
     */
    findRdbFiles(directory) {
        const rdbFiles = [];
        
        if (!fs.existsSync(directory)) {
            console.warn(`Directory ${directory} does not exist, skipping...`);
            return rdbFiles;
        }

        const items = fs.readdirSync(directory);
        
        for (const item of items) {
            const fullPath = path.join(directory, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Recursively search subdirectories
                rdbFiles.push(...this.findRdbFiles(fullPath));
            } else if (stat.isFile() && item.endsWith('.rdb')) {
                rdbFiles.push(fullPath);
            }
        }
        
        return rdbFiles;
    }

    /**
     * Parse statements from .rdb file content (similar to demo format)
     */
    parseStatements(content) {
        const lines = content.split('\n');
        const statements = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and comments
            if (!line || line.startsWith('//')) {
                continue;
            }
            
            // Check if this looks like a statement
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
                        
                        if (nextLine.endsWith(';') || this.isCompleteStatement(currentStatement)) {
                            i = j;
                            break;
                        }
                    }
                }
                
                if (this.isCompleteStatement(currentStatement)) {
                    const trimmed = currentStatement.replace(/;$/, '').trim();
                    statements.push(trimmed);
                }
            }
        }
        
        return statements;
    }

    /**
     * Check if a statement is complete (similar logic to CodeEditor)
     */
    isCompleteStatement(stmt) {
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
    }

    /**
     * Execute a single .rdb test file
     */
    async executeRdbFile(filePath) {
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(`\n🧪 Testing: ${relativePath}`);
        
        const testResult = {
            file: relativePath,
            passed: false,
            error: null,
            logErrors: [],
            statements: [],
            executionTime: 0
        };
        
        try {
            // Read and parse the .rdb file
            const content = fs.readFileSync(filePath, 'utf8');
            const statements = this.parseStatements(content);
            testResult.statements = statements;
            
            if (statements.length === 0) {
                testResult.error = 'No valid statements found in file';
                return testResult;
            }
            
            console.log(`   Found ${statements.length} statements`);
            
            // Create fresh StreamManager and QueryEngine for this test
            const streamManager = new StreamManager();
            const queryEngine = new QueryEngine(streamManager);
            
            // Subscribe to _log stream to capture errors
            const logErrors = [];
            streamManager.subscribeToStream('_log', (data) => {
                const logData = data.data;
                // Consider error levels and actual errors
                if (logData.level === 'error' || logData.code === 'COMMAND_FAILED' || 
                    (logData.operator && logData.message && logData.message.includes('mismatch'))) {
                    logErrors.push(logData);
                }
            });
            
            const startTime = Date.now();
            
            // Execute all statements
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                console.log(`   Executing [${i + 1}/${statements.length}]: ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`);
                
                try {
                    await queryEngine.executeStatement(statement);
                    // Small delay to allow async processing
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    throw new Error(`Statement ${i + 1} failed: ${error.message}`);
                }
            }
            
            // Wait a bit more for any async operations to complete
            await new Promise(resolve => setTimeout(resolve, 200));
            
            testResult.executionTime = Date.now() - startTime;
            testResult.logErrors = logErrors;
            
            // Test passes if no errors were logged
            if (logErrors.length === 0) {
                testResult.passed = true;
                console.log(`   ✅ PASSED (${testResult.executionTime}ms)`);
            } else {
                testResult.passed = false;
                console.log(`   ❌ FAILED: ${logErrors.length} error(s) logged`);
                logErrors.forEach(error => {
                    console.log(`      - ${error.message || error.code || 'Unknown error'}`);
                });
            }
            
        } catch (error) {
            testResult.passed = false;
            testResult.error = error.message;
            console.log(`   ❌ FAILED: ${error.message}`);
        }
        
        return testResult;
    }

    /**
     * Run all tests in the specified directories
     */
    async runAllTests() {
        console.log('🚀 RDB Test Runner Starting...\n');
        
        // Find all .rdb files
        const allRdbFiles = [];
        for (const directory of this.testDirectories) {
            const files = this.findRdbFiles(directory);
            allRdbFiles.push(...files);
        }
        
        if (allRdbFiles.length === 0) {
            console.log('⚠️  No .rdb files found in specified directories');
            console.log('   Searched directories:', this.testDirectories);
            return this.results;
        }
        
        console.log(`📁 Found ${allRdbFiles.length} .rdb test file(s):`);
        allRdbFiles.forEach(file => {
            console.log(`   - ${path.relative(process.cwd(), file)}`);
        });
        
        this.results.total = allRdbFiles.length;
        
        // Execute each test file
        for (const rdbFile of allRdbFiles) {
            const result = await this.executeRdbFile(rdbFile);
            this.results.details.push(result);
            
            if (result.passed) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }
        }
        
        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total tests: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed} ✅`);
        console.log(`Failed: ${this.results.failed} ❌`);
        console.log(`Success rate: ${(this.results.passed / this.results.total * 100).toFixed(1)}%`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.details.filter(r => !r.passed).forEach(result => {
                console.log(`   - ${result.file}: ${result.error || `${result.logErrors.length} error(s)`}`);
            });
        }
        
        return this.results;
    }
}

// Export for use as a module
export { RdbTestRunner };

// If run directly, execute with default directories
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new RdbTestRunner();
    const results = await runner.runAllTests();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}