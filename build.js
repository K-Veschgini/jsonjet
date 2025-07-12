#!/usr/bin/env bun

import { mkdir, rm, cp } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const RELEASE_DIR = 'release';

async function clean() {
    console.log('🧹 Cleaning release directory...');
    if (existsSync(RELEASE_DIR)) {
        await rm(RELEASE_DIR, { recursive: true });
    }
    await mkdir(RELEASE_DIR, { recursive: true });
}

async function buildSingle() {
    console.log('📦 Building single file bundle...');
    const result = await Bun.build({
        entrypoints: ['./main.js'],
        outdir: RELEASE_DIR,
        target: 'node',
        format: 'esm',
        minify: true,
        sourcemap: 'external',
        naming: 'resonancedb.js'
    });
    
    if (!result.success) {
        console.error('❌ Single file build failed:', result.logs);
        process.exit(1);
    }
    console.log('✅ Single file build complete');
}

async function buildModular() {
    console.log('📂 Building modular version...');
    
    // Create lib directory in release
    await mkdir(join(RELEASE_DIR, 'lib'), { recursive: true });
    
    // Copy source files
    await cp('src', join(RELEASE_DIR, 'lib', 'src'), { recursive: true });
    await cp('main.js', join(RELEASE_DIR, 'lib', 'main.js'));
    await cp('package.json', join(RELEASE_DIR, 'lib', 'package.json'));
    
    console.log('✅ Modular build complete');
}

async function buildExamples() {
    console.log('📝 Building examples...');
    
    await mkdir(join(RELEASE_DIR, 'examples'), { recursive: true });
    await cp('examples', join(RELEASE_DIR, 'examples'), { recursive: true });
    
    // Fix import paths in copied examples (only process files that exist)
    const exampleFiles = [
        'examples/flow-demo.js'
    ];
    
    for (const file of exampleFiles) {
        const filePath = join(RELEASE_DIR, file);
        if (existsSync(filePath)) {
            const content = await Bun.file(filePath).text();
            let updatedContent = content
                // Fix relative imports to use lib structure
                .replace(/from '\.\.\/src\//g, "from '../lib/src/")
                .replace(/from '\.\.\/\.\./g, "from '../../lib")
                .replace(/from '\.\.\/\.\.\//g, "from '../../lib/");
            await Bun.write(filePath, updatedContent);
        }
    }
    
    console.log('✅ Examples copied and paths fixed');
}

async function createDocs() {
    console.log('📖 Creating documentation...');
    
    const releaseReadme = `# ResonanceDB - Stream Processing Database

A high-performance stream processing database with flow-based architecture for real-time data processing.

## Quick Start

 ### Single File Bundle
 \`\`\`bash
 bun resonancedb.js
 \`\`\`
 
 ### Modular Version
 \`\`\`bash
 cd lib
 bun main.js
 \`\`\`

## Features

- **Scan Operator**: Azure ADX-style pattern matching
- **Filter Operator**: Predicate-based filtering  
- **Map Operator**: Document transformation
- **Sorter Operator**: Real-time time-series sorting
- **Stream Pipeline**: Chainable operator composition

## Usage

\`\`\`javascript
import { Stream, ScanOperator, Filter, Map } from './lib/src/index.js';

const pipeline = new Stream()
    .pipe(new ScanOperator().addStep('login', (s, r) => r.event === 'login'))
    .pipe(new Filter(doc => doc.score > 0.5))
    .pipe(new Map(doc => ({ ...doc, processed: true })))
    .collect(result => console.log(result));

pipeline.push({ event: 'login', score: 0.8 });
\`\`\`

Built with Bun ${Bun.version}
Generated on ${new Date().toISOString()}
`;
    
    await Bun.write(join(RELEASE_DIR, 'README.md'), releaseReadme);
    console.log('✅ Documentation created');
}

async function main() {
    try {
        console.log('🚀 Starting build process...\n');
        
        await clean();
        await buildSingle();
        await buildModular();
        await buildExamples();
        await createDocs();
        
        console.log('\n🎉 Build complete! Release ready in ./release/');
        console.log('📁 Contents:');
        console.log('  - resonancedb.js   (single file bundle)');
        console.log('  - lib/             (modular source)');
        console.log('  - examples/        (usage examples)');
        console.log('  - README.md        (documentation)');
        
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

main(); 