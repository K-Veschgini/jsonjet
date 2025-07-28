# delete stream Statement

The `delete stream` statement removes a stream and all its data.

## Syntax

```jsonjet
delete stream <stream_name>
```

## Description

The `delete stream` statement removes a named stream from the system. This operation is irreversible and will stop all flows that are reading from the stream.

## Parameters

- `stream_name`: Name of the stream to delete (must be a valid identifier)

## Examples

### Basic Stream Deletion

```jsonjet
delete stream old_sensor_data
delete stream temp_stream
delete stream backup_events
```

### Cleanup Operations

```jsonjet
delete stream test_stream
delete stream temporary_data
delete stream expired_events
```

## Behavior

- Removes the stream and all associated metadata
- Stops all flows that are reading from the stream
- Removes all subscriptions to the stream
- Any data currently in the stream is lost
- Operation is irreversible

## Use Cases

### Cleanup
Remove streams that are no longer needed.

### Testing
Clean up test streams after testing.

### Resource Management
Free up system resources by removing unused streams.

### Maintenance
Remove streams during system maintenance.

## Related Statements

- [create stream](./create-stream.md) - Create a new stream
- [list](./list.md) - List all streams
- [flush](./flush.md) - Clear stream data without deleting 