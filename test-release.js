#!/usr/bin/env bun

import { spawn } from 'bun';
import { existsSync } from 'fs';

async function testSingleBundle() {
    console.log('🧪 Testing single file bundle...');
    
    if (!existsSync('release/jsdb.js')) {
        console.error('❌ Single bundle not found. Run: bun run build');
        return false;
    }
    
    const proc = spawn(['bun', 'release/jsdb.js'], { stdout: 'pipe' });
    const output = await new Response(proc.stdout).text();
    
    if (output.includes('session_id')) {
        console.log('✅ Single bundle works correctly');
        return true;
    } else {
        console.error('❌ Single bundle test failed');
        return false;
    }
}

async function testModular() {
    console.log('🧪 Testing modular version...');
    
    if (!existsSync('release/lib/main.js')) {
        console.error('❌ Modular version not found. Run: bun run build');
        return false;
    }
    
    const proc = spawn(['bun', 'release/lib/main.js'], { stdout: 'pipe' });
    const output = await new Response(proc.stdout).text();
    
    if (output.includes('session_id')) {
        console.log('✅ Modular version works correctly');
        return true;
    } else {
        console.error('❌ Modular version test failed');
        return false;
    }
}

async function main() {
    console.log('🚀 Testing release builds...\n');
    
    const singleOk = await testSingleBundle();
    const modularOk = await testModular();
    
    if (singleOk && modularOk) {
        console.log('\n🎉 All tests passed! Release is ready for distribution.');
        console.log('\n📦 Distribution options:');
        console.log('  - Standalone: release/jsdb.js (2.1KB minified)');
        console.log('  - Library:    release/lib/ (full source)');
        console.log('  - Examples:   release/examples/');
    } else {
        console.log('\n❌ Some tests failed. Check the build.');
        process.exit(1);
    }
}

main(); 