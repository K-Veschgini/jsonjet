# Server CLI

The JSONJet server can be started from the command line.

## Usage

```bash
./jsonjet [options]
```

## Options

- `--port <number>` - HTTP server port (default: 3333)
- `--host <string>` - HTTP server host (default: localhost)
- `--ws-port <number>` - WebSocket server port (default: 3333)
- `--ws-host <string>` - WebSocket server host (default: localhost)

## Examples

```bash
# Start with default settings
./jsonjet

# Start on custom port
./jsonjet --port 8080

# Start on specific host and port
./jsonjet --host 0.0.0.0 --port 8080
``` 