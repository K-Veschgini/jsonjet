#!/usr/bin/env bun

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, cwd = rootDir) {
  log(`Running: ${command}`, 'blue');
  try {
    execSync(command, { cwd, stdio: 'inherit' });
  } catch (error) {
    log(`Error running command: ${command}`, 'red');
    throw error;
  }
}

// Releases will be fetched dynamically on the client-side

async function cleanDist() {
  log('Cleaning dist directory...', 'yellow');
  const distDir = path.join(rootDir, 'dist');
  try {
    await fs.rm(distDir, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist, that's ok
  }
  await fs.mkdir(distDir, { recursive: true });
}

async function buildCore() {
  log('Core packages are source-only, skipping build...', 'yellow');
  // Both @jsonjet/core and @jsonjet/ui are just source files
  // They're consumed directly by the demo via workspace dependencies
  log('Core packages ready', 'green');
}

async function buildDocs() {
  log('Building documentation...', 'yellow');
  exec('bun run build', path.join(rootDir, 'docs'));
  log('Documentation built', 'green');
}

async function buildDemo() {
  log('Building demo with /jsonjet/demo/ base path...', 'yellow');
  
  // The vite.config.js already has the correct configuration with Monaco Editor optimizations
  exec('bun run build', path.join(rootDir, 'packages/demo'));
  log('Demo built', 'green');
}

async function combineBuildOutputs() {
  log('Combining build outputs...', 'yellow');
  
  const distDir = path.join(rootDir, 'dist');
  
  // Copy docs build (main site)
  const docsOutput = path.join(rootDir, 'docs/.vitepress/dist');
  exec(`cp -r "${docsOutput}/"* "${distDir}/"`);
  
  // Copy demo build to /demo subdirectory
  const demoOutput = path.join(rootDir, 'packages/demo/dist');
  const demoTarget = path.join(distDir, 'demo');
  await fs.mkdir(demoTarget, { recursive: true });
  exec(`cp -r "${demoOutput}/"* "${demoTarget}/"`);
  
  log('Build outputs combined', 'green');
}

async function showBuildSummary() {
  log('\n🎉 Build completed successfully!', 'green');
  log('\nGenerated files:', 'blue');
  log('  📁 dist/               - Main documentation site');
  log('  📁 dist/demo/          - Interactive demo');
  log('  📄 dist/guide/         - Documentation pages');
  log('\nTo preview locally:', 'yellow');
  log('  bunx serve dist', 'blue');
  log('  # Visit http://localhost:3000\n');
}

async function main() {
  try {
    log('🚀 Starting local build...', 'blue');
    
    await cleanDist();
    
    await buildCore();
    await buildDocs();
    await buildDemo();
    
    await combineBuildOutputs();
    
    await showBuildSummary();
    
  } catch (error) {
    log(`\n❌ Build failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();