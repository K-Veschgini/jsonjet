# Log Stream

The `_log` stream provides access to JSONJet system logging information.

## Overview

JSONJet maintains an internal `_log` stream that captures system events, errors, and operational messages. This stream serves as the primary mechanism for accessing runtime information about the JSONJet server and processing flows.

## Accessing Logs

### Subscription Required

By default, JSONJet doesn't persist logs to disk. To access log information, you must subscribe to the `_log` stream.

### Log Message Format

Log messages follow a structured format containing:

- **timestamp**: When the event occurred
- **level**: Log level (info, warn, error, debug)
- **message**: Human-readable description of the event
- **component**: Which system component generated the log
- **metadata**: Additional context-specific information

Example log message:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Flow 'data_processor' started successfully",
  "component": "flow_manager",
  "metadata": {
    "flow_id": "data_processor",
    "input_stream": "sensor_data"
  }
}
```

## Persisting Logs

### Writing to File

To persist logs to disk, create a flow that subscribes to the `_log` stream and uses the `write_to_file` operator:

```jsonjet
create flow log_writer as
  _log
  | write_to_file("logs/system.log", { append: true })
```

### Filtered Logging

You can create selective logging by filtering specific log levels or components:

```jsonjet
create flow error_logger as
  _log
  | where level = "error"
  | write_to_file("logs/errors.log", { append: true })

create flow flow_logger as
  _log
  | where component = "flow_manager"
  | write_to_file("logs/flows.log", { append: true })
```

## Log Levels

The system generates logs at different levels:

- **debug**: Detailed diagnostic information
- **info**: General operational messages
- **warn**: Warning conditions that don't prevent operation
- **error**: Error conditions that may affect functionality

## Performance Considerations

- The `_log` stream operates like any other stream - unsubscribed messages are discarded
- High-frequency logging can impact system performance
- Consider log level filtering for production environments
- Rotate log files periodically to manage disk usage

## System Behavior

By design, JSONJet doesn't automatically write logs to disk. This approach:

- Reduces I/O overhead in production environments
- Allows flexible log routing and processing
- Enables custom log formatting and filtering
- Follows streaming architecture principles

You have complete control over which logs to persist and how to structure them based on your operational requirements.

## Related Documentation

- [subscribe](../jet/statements/subscribe.md) - Subscribe to streams
- [write_to_file](../jet/operators/write-to-file.md) - Persist data to disk
- [where](../jet/operators/where.md) - Filter log messages
- [select](../jet/operators/select.md) - Transform log format