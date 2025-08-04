#!/usr/bin/env bun

/**
 * Cross-platform build script for JSONJet Server
 * Compiles standalone executables for all Bun-supported platforms
 */

import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const SERVER_SOURCE = './packages/server/src/index.js';
const RELEASE_DIR = './release';

// All platforms supported by Bun for cross-compilation
const TARGETS = [
  {
    target: 'bun-linux-x64',
    executableName: 'jsonjet',
    archiveName: 'jsonjet-server-linux-x64-glibc',
    description: 'Linux x64 (glibc)',
    extension: ''
  },
  {
    target: 'bun-linux-x64-baseline',
    executableName: 'jsonjet',
    archiveName: 'jsonjet-server-linux-x64-baseline-glibc',
    description: 'Linux x64 baseline (glibc, older CPUs)',
    extension: ''
  },
  {
    target: 'bun-linux-arm64',
    executableName: 'jsonjet',
    archiveName: 'jsonjet-server-linux-arm64-glibc',
    description: 'Linux ARM64 (glibc)',
    extension: ''
  },
  {
    target: 'bun-linux-x64-musl',
    executableName: 'jsonjet',
    archiveName: 'jsonjet-server-linux-x64-musl',
    description: 'Linux x64 (musl, Alpine)',
    extension: ''
  },
  {
    target: 'bun-linux-arm64-musl',
    executableName: 'jsonjet',
    archiveName: 'jsonjet-server-linux-arm64-musl',
    description: 'Linux ARM64 (musl, Alpine)',
    extension: ''
  },
  {
    target: 'bun-windows-x64-baseline',
    executableName: 'jsonjet.exe',
    archiveName: 'jsonjet-server-windows-x64-baseline',
    description: 'Windows x64 baseline (older CPUs)',
    extension: '.exe'
  },
  {
    target: 'bun-windows-x64',
    executableName: 'jsonjet.exe',
    archiveName: 'jsonjet-server-windows-x64',
    description: 'Windows x64 (CPUs from 2013 and newer)',
    extension: '.exe'
  },
  {
    target: 'bun-darwin-x64',
    executableName: 'jsonjet',
    archiveName: 'jsonjet-server-macos-x64',
    description: 'macOS x64 (Intel)',
    extension: ''
  },
  {
    target: 'bun-darwin-arm64',
    executableName: 'jsonjet',
    archiveName: 'jsonjet-server-macos-arm64',
    description: 'macOS ARM64 (Apple Silicon)',
    extension: ''
  }
];

async function getCurrentGitTag() {
  try {
    // Check if we're on a tag
    const tagResult = await Bun.spawn(['git', 'describe', '--exact-match', '--tags'], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    await tagResult.exited;
    
    if (tagResult.exitCode === 0) {
      const tag = await new Response(tagResult.stdout).text();
      return tag.trim();
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function getBunVersion() {
  try {
    const result = await Bun.spawn(['bun', '--version'], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    const version = await new Response(result.stdout).text();
    return version.trim();
  } catch {
    return 'unknown';
  }
}

async function buildAll() {
  console.log('🏗️  Cross-platform JSONJet Server Build');
  console.log('=' .repeat(50));
  
  // Check for Git tag
  const version = await getCurrentGitTag();
  if (!version) {
    console.error('❌ No Git tag found. Please create and checkout a tag before building.');
    console.error('   Example: git tag v1.0.0 && git checkout v1.0.0');
    process.exit(1);
  }
  
  console.log(`📦 Building version: ${version}\n`);
  
  // Check if source exists
  if (!existsSync(SERVER_SOURCE)) {
    console.error(`❌ Source file not found: ${SERVER_SOURCE}`);
    process.exit(1);
  }
  
  // Clean and create release directory
  if (existsSync(RELEASE_DIR)) {
    console.log('🧹 Cleaning existing release directory...');
    rmSync(RELEASE_DIR, { recursive: true, force: true });
  }
  
  mkdirSync(RELEASE_DIR, { recursive: true });
  console.log(`📁 Created release directory: ${RELEASE_DIR}\n`);
  
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  
  // Build for each target
  for (const { target, executableName, archiveName, description, extension } of TARGETS) {
    const tempExecutablePath = join(RELEASE_DIR, executableName);
    const versionedArchiveName = `${archiveName}-${version}`;
    
    console.log(`🔨 Building for ${target}...`);
    console.log(`   ${description}`);
    
    const startTime = Date.now();
    
    try {
      // Build command
      const result = await Bun.spawn([
        'bun', 'build',
        SERVER_SOURCE,
        '--compile',
        '--minify',
        '--sourcemap',
        `--target=${target}`,
        `--outfile=${tempExecutablePath}`,
        `--define=VERSION=${JSON.stringify(version)}`
      ], {
        cwd: process.cwd(),
        stdio: ['inherit', 'inherit', 'inherit']
      });
      
      await result.exited;
      
      if (result.exitCode === 0) {
        const duration = Date.now() - startTime;
        console.log(`   ✅ Build successful (${duration}ms)`);
        
        // Get file size
        const stat = await Bun.file(tempExecutablePath).size;
        const sizeMB = (stat / 1024 / 1024).toFixed(1);
        console.log(`   📦 Size: ${sizeMB} MB`);
        
        // Create compressed archives
        console.log(`   📦 Creating archives...`);
        
        // Create tgz archive
        const tgzResult = await Bun.spawn([
          'tar', '-czf', 
          join(RELEASE_DIR, `${versionedArchiveName}.tar.gz`),
          '-C', RELEASE_DIR, executableName
        ], {
          stdio: ['inherit', 'inherit', 'inherit']
        });
        
        await tgzResult.exited;
        
        // Create zip archive
        const zipResult = await Bun.spawn([
          'zip', '-j',
          join(RELEASE_DIR, `${versionedArchiveName}.zip`),
          tempExecutablePath
        ], {
          stdio: ['inherit', 'inherit', 'inherit']
        });
        
        await zipResult.exited;
        
        if (tgzResult.exitCode === 0 && zipResult.exitCode === 0) {
          console.log(`   ✅ Archives created successfully`);
          
          // Clean up temporary executable
          rmSync(tempExecutablePath);
          
          results.push({
            target,
            archiveName: versionedArchiveName,
            description,
            success: true,
            duration,
            size: stat,
            sizeMB
          });
          successCount++;
        } else {
          console.log(`   ❌ Archive creation failed`);
          results.push({
            target,
            archiveName: versionedArchiveName,
            description,
            success: false,
            error: `Archive creation failed - tgz: ${tgzResult.exitCode}, zip: ${zipResult.exitCode}`
          });
          failureCount++;
        }
      } else {
        console.log(`   ❌ Build failed (exit code: ${result.exitCode})`);
        
        results.push({
          target,
          archiveName: versionedArchiveName,
          description,
          success: false,
          error: `Build failed - exit code: ${result.exitCode}`
        });
        failureCount++;
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({
        target,
        archiveName: versionedArchiveName,
        description,
        success: false,
        error: error.message
      });
      failureCount++;
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Build Summary');
  console.log('=' .repeat(50));
  console.log(`📦 Version: ${version}`);
  console.log(`✅ Successful builds: ${successCount}`);
  console.log(`❌ Failed builds: ${failureCount}`);
  console.log(`📁 Output directory: ${RELEASE_DIR}\n`);
  
  // Detailed results
  console.log('📋 Detailed Results:');
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const sizeInfo = result.success ? ` (${result.sizeMB} MB)` : '';
    console.log(`${status} ${result.archiveName}${sizeInfo}`);
    console.log(`   ${result.description}`);
    if (result.success) {
      console.log(`   📦 Archives: ${result.archiveName}.tar.gz, ${result.archiveName}.zip`);
    }
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }
  
  // Create build info file
  const buildInfo = {
    version,
    buildTime: new Date().toISOString(),
    bunVersion: await getBunVersion(),
    sourceFile: SERVER_SOURCE,
    targets: results,
    summary: {
      total: TARGETS.length,
      successful: successCount,
      failed: failureCount
    }
  };
  
  await Bun.write(
    join(RELEASE_DIR, 'build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );
  
  console.log('💾 Build information saved to build-info.json');
  
  if (failureCount > 0) {
    console.log(`\n⚠️  ${failureCount} builds failed. Check the errors above.`);
    process.exit(1);
  } else {
    console.log('\n🎉 All builds completed successfully!');
  }
}

// Run if this script is executed directly
if (import.meta.main) {
  buildAll().catch(console.error);
}

export { buildAll }; 