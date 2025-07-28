# info Statement

The `info` statement shows information about streams.

## Syntax

```jsonjet
info
info <stream_name>
```

## Description

The `info` statement displays detailed information about streams. When used without a stream name, it shows information for all streams. When used with a stream name, it shows detailed information for that specific stream.

## Parameters

- `stream_name` (optional): Name of the specific stream to get information about

## Examples

### Get All Stream Information

```jsonjet
info
```

**Output:**
```
Stream information retrieved
{
  "sensor_data": {
    "documentCount": 150,
    "subscriberCount": 2,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "events": {
    "documentCount": 25,
    "subscriberCount": 1,
    "createdAt": "2024-01-15T11:00:00Z"
  }
}
```

### Get Specific Stream Information

```jsonjet
info sensor_data
```

**Output:**
```
Stream 'sensor_data' info retrieved
{
  "documentCount": 150,
  "subscriberCount": 2,
  "createdAt": "2024-01-15T10:30:00Z",
  "lastActivity": "2024-01-15T12:45:00Z"
}
```

## Information Fields

### Document Count
Number of documents currently in the stream.

### Subscriber Count
Number of active subscribers to the stream.

### Created At
Timestamp when the stream was created.

### Last Activity
Timestamp of the last activity on the stream.

## Use Cases

### Monitoring
Monitor stream health and activity.

### Debugging
Investigate stream behavior and performance.

### Administration
Manage stream resources and configurations.

### Development
Verify stream creation and configuration.

## Related Statements

- [list](./list.md) - List streams with basic information
- [create stream](./create-stream.md) - Create streams to get info about
- [subscribe](./subscribe.md) - Subscribe to streams 