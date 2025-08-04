# delete stream Statement

The `delete stream` statement removes a stream from the system.

## Syntax

```jsonjet
delete stream <stream_name>
```

## Description

This statement permanently removes a named stream and terminates all associated flows. The operation can't be undone, so consider the impact on dependent components before execution.

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

- Removes stream and associated metadata
- Terminates flows reading from the stream
- Cancels all active subscriptions
- Discards any buffered data
- Cannot be reversed

## Related Statements

- [create stream](./create-stream.md) - Create a new stream
- [list](./list.md) - List all streams
- [flush](./flush.md) - Clear stream data without deleting 