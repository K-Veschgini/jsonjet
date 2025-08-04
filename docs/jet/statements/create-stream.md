# create stream Statement

The `create stream` statement defines a new data stream for document routing.

## Syntax

```jsonjet
create stream <stream_name>
create or replace stream <stream_name>
create if not exists stream <stream_name>
```

## Description

This statement creates a named data stream that routes documents between components. Streams function as data pipes within the JSONJet architecture - they don't persist data but ensure it reaches active subscribers.

## Parameters

- `stream_name`: Identifier for the stream (must start with letter/underscore, contain only letters, numbers, and underscores)

## Modifiers

### or replace
Replaces an existing stream if it exists, otherwise creates a new one.

### if not exists
Only creates the stream if it doesn't already exist. If the stream exists, the statement succeeds without error.

## Examples

### Basic Stream Creation

```jsonjet
create stream sensor_data
create stream user_events
create stream application_logs
```

### With Replace Modifier

```jsonjet
create or replace stream sensor_data
create or replace stream events
```

### With Existence Check

```jsonjet
create if not exists stream sensor_data
create if not exists stream backup_stream
```

## Stream Behavior

- Documents route immediately to active subscribers
- Undelivered data is discarded (standard streaming semantics)  
- No persistence - streams aren't storage mechanisms
- Multiple flows can consume from the same stream
- Supports multiple concurrent subscribers

## Related Statements

- [delete stream](./delete-stream.md) - Remove a stream
- [insert into](./insert-into.md) - Add data to a stream
- [subscribe](./subscribe.md) - Listen to a stream
- [list](./list.md) - List all streams 