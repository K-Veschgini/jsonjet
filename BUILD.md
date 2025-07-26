# Cross-Platform Build Guide

This document explains how to build JSONJet Server for all supported platforms.

## Quick Start

```bash
# Build for all platforms
bun run build:server

# Or run the build script directly
bun run build-server.js
```

## Supported Platforms

The build script compiles JSONJet Server for all platforms supported by Bun:

| Platform | Architecture | Binary Name | Description |
|----------|-------------|-------------|-------------|
| **Linux** | x64 | `jsonjet-server-linux-x64-glibc` | Standard Linux (glibc) |
| | x64 baseline | `jsonjet-server-linux-x64-baseline-glibc` | Older CPUs (pre-2013) |
| | ARM64 | `jsonjet-server-linux-arm64-glibc` | ARM64 Linux (glibc) |
| | x64 musl | `jsonjet-server-linux-x64-musl` | Alpine Linux |
| | ARM64 musl | `jsonjet-server-linux-arm64-musl` | ARM64 Alpine |
| **Windows** | x64 | `jsonjet-server-windows-x64.exe` | Modern Windows |
| | x64 baseline | `jsonjet-server-windows-x64-baseline.exe` | Older CPUs |
| **macOS** | x64 | `jsonjet-server-darwin-x64` | Intel Macs |
| | ARM64 | `jsonjet-server-darwin-arm64` | Apple Silicon |

## Build Output

All binaries are created in the `release/` folder with:

- **Minification** enabled for smaller binary size
- **Source maps** embedded for better error reporting  
- **Full JSONJet functionality** including HTTP API and WebSocket streaming
- **No dependencies** required on target systems

### Binary Sizes

Typical binary sizes:
- **macOS ARM64**: ~57 MB
- **macOS x64**: ~62 MB  
- **Linux ARM64 (musl)**: ~87 MB
- **Linux x64 (musl)**: ~91 MB
- **Linux ARM64**: ~92 MB
- **Linux x64**: ~98-103 MB
- **Windows x64**: ~112-118 MB

## Build Requirements

- **Bun** v1.1.5+ (for cross-compilation support)
- **Network connection** (for downloading cross-compilation binaries)
- **~2 GB disk space** (for all binaries + intermediate files)

## Usage Examples

### Building Specific Platforms

To build for a specific platform manually:

```bash
# Linux x64
bun build packages/server/src/index.js --compile --minify --sourcemap --target=bun-linux-x64 --outfile=release/jsonjet-server-linux-x64-glibc

# Windows x64  
bun build packages/server/src/index.js --compile --minify --sourcemap --target=bun-windows-x64 --outfile=release/jsonjet-server-windows-x64.exe

# macOS ARM64
bun build packages/server/src/index.js --compile --minify --sourcemap --target=bun-darwin-arm64 --outfile=release/jsonjet-server-darwin-arm64
```

### Deployment

The compiled binaries are standalone and include:
- Bun runtime
- JSONJet server code
- All dependencies
- Full HTTP API and WebSocket functionality

Simply copy the appropriate binary to your target system and run:

```bash
# Linux/macOS
./jsonjet-server-linux-x64-glibc

# Windows  
jsonjet-server-windows-x64.exe
```

The server will start on `http://localhost:3000` by default.

## Build Metadata

Each build creates a `build-info.json` file containing:
- Build timestamp
- Bun version used
- Target information
- Build success/failure status
- Binary sizes and build times

## Troubleshooting

### Common Issues

1. **Network timeouts during cross-compilation**
   - Bun downloads cross-compilation binaries on first use
   - Ensure stable internet connection
   - Retry the build if downloads fail

2. **Disk space errors**
   - Each binary is 50-120 MB
   - Ensure at least 2 GB free space

3. **Permission errors on output**
   - Check write permissions to `release/` folder
   - On Unix systems, built binaries are executable by default

### Build Script Features

The build script (`build-server.js`) provides:
- ✅ Automatic cleanup of previous builds
- ✅ Progress reporting for each platform
- ✅ Build time and size metrics
- ✅ Comprehensive error handling
- ✅ Build metadata generation
- ✅ Summary reporting

## CI/CD Integration

For automated builds in CI/CD:

```yaml
# Example GitHub Actions
- name: Build JSONJet Server
  run: bun run build:server

- name: Upload Release Artifacts
  uses: actions/upload-artifact@v3
  with:
    name: jsonjet-server-binaries
    path: release/
```

The build process is deterministic and suitable for automated release pipelines. 