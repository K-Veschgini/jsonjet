# Server CLI

The JSONJet server can be started from the command line.

## Usage

```bash
bun run src/index.js [options]
```

## Options

- `-h, --host <host>` - Host to bind to (default: localhost)
- `-p, --port <port>` - Port to listen on (default: 3333)
- `-v, --verbose` - Enable verbose logging (default: false)
- `--version` - Show version information
- `--help` - Show this help message

## Examples

```bash
# Start with default settings
bun run src/index.js

# Start on custom port
bun run src/index.js --port 8080

# Start on specific host and port
bun run src/index.js --host 0.0.0.0 --port 8080

# Enable verbose logging
bun run src/index.js --verbose

# Show version
bun run src/index.js --version

# Show help
bun run src/index.js --help
``` 