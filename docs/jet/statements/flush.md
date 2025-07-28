# flush Statement

The `flush` statement clears all data from a stream.

## Syntax

```jsonjet
flush <stream_name>
```

## Description

The `flush` statement removes all data from a specified stream. This operation clears the stream's internal buffers but keeps the stream itself intact.

## Parameters

- `stream_name`: Name of the stream to flush (must be a valid identifier)

## Examples

### Basic Stream Flush

```jsonjet
flush sensor_data
flush temp_stream
flush event_buffer
```

### Maintenance Operations

```jsonjet
flush old_data
flush test_stream
flush backup_buffer
```

## Behavior

- Clears all data currently in the stream
- Stream remains active and can receive new data
- All flows reading from the stream continue to operate
- All subscriptions remain active
- Operation is immediate and irreversible

## Use Cases

### Memory Management
Free up memory by clearing old data from streams.

### Testing
Clear test data between test runs.

### Maintenance
Clear accumulated data during system maintenance.

### Performance
Clear buffers to improve performance.

### Debugging
Clear data to start fresh debugging sessions.

## Related Statements

- [delete stream](./delete-stream.md) - Remove a stream entirely
- [list](./list.md) - List all streams
- [info](./info.md) - Get stream information 