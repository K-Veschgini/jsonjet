import fs from 'fs';
import path from 'path';
import { createInstances } from '../src/instances.js';

/**
 * JET Test Runner - Discovers and runs all .jet query files in specified directories
 * Each .jet file is executed with a fresh StreamManager and checked for errors in _log stream
 */
class JetTestRunner {
    constructor(testDirectories = ['tests/jet-tests']) {
        this.testDirectories = testDirectories;
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }

    /**
     * Recursively find all .jet files in the specified directories
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
            } else if (stat.isFile() && item.endsWith('.jet')) {
                rdbFiles.push(fullPath);
            }
        }
        
        return rdbFiles;
    }

    // Remove manual statement parsing - now handled by unified parser

    /**
     * Execute a single .jet test file
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
            // Read the .jet file
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Create fresh instances for this test
            const { streamManager, queryEngine } = createInstances();
            
            // Parse statements using unified parser
            const statements = queryEngine.parseStatements(content);
            testResult.statements = statements.map(s => s.text);
            
            if (statements.length === 0) {
                testResult.error = 'No valid statements found in file';
                return testResult;
            }
            
            console.log(`   Found ${statements.length} statements`);
            
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
            
            // Execute all statements using unified engine
            const results = await queryEngine.executeStatements(statements);
            
            // Log execution progress
            results.forEach((result, i) => {
                const stmt = result.statement;
                console.log(`   Executing [${i + 1}/${statements.length}]: ${stmt.text.substring(0, 60)}${stmt.text.length > 60 ? '...' : ''}`);
                if (!result.success) {
                    console.log(`      Error: ${result.error}`);
                }
            });
            
            // Wait a bit for any async operations to complete
            await new Promise(resolve => setTimeout(resolve, 200));
            
            testResult.executionTime = Date.now() - startTime;
            testResult.logErrors = logErrors;
            
            // Test passes if no errors were logged AND all statements executed successfully
            const hasExecutionErrors = results.some(r => !r.success);
            if (logErrors.length === 0 && !hasExecutionErrors) {
                testResult.passed = true;
                console.log(`   ✅ PASSED (${testResult.executionTime}ms)`);
            } else {
                testResult.passed = false;
                const errorCount = logErrors.length + results.filter(r => !r.success).length;
                console.log(`   ❌ FAILED: ${errorCount} error(s)`);
                
                // Log execution errors
                results.filter(r => !r.success).forEach(result => {
                    console.log(`      - Statement failed: ${result.error}`);
                });
                
                // Log stream errors
                logErrors.forEach(error => {
                    console.log(`      - Stream error: ${error.message || error.code || 'Unknown error'}`);
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
        console.log('🚀 JET Test Runner Starting...\n');
        
        // Find all .jet files
        const allRdbFiles = [];
        for (const directory of this.testDirectories) {
            const files = this.findRdbFiles(directory);
            allRdbFiles.push(...files);
        }
        
        if (allRdbFiles.length === 0) {
            console.log('⚠️  No .jet files found in specified directories');
            console.log('   Searched directories:', this.testDirectories);
            return this.results;
        }
        
        console.log(`📁 Found ${allRdbFiles.length} .jet test file(s):`);
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
export { JetTestRunner };


// If run directly, execute with default directories
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new JetTestRunner();
    const results = await runner.runAllTests();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}