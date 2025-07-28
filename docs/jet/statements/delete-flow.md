# delete flow Statement

The `delete flow` statement stops and removes a processing flow.

## Syntax

```jsonjet
delete flow <flow_name>
```

## Description

The `delete flow` statement stops a running flow and removes it from the system. This operation stops the flow immediately and is irreversible.

## Parameters

- `flow_name`: Name of the flow to delete (must be a valid identifier)

## Examples

### Basic Flow Deletion

```jsonjet
delete flow data_processor
delete flow temp_monitor
delete flow user_analytics
```

### Cleanup Operations

```jsonjet
delete flow test_flow
delete flow temporary_processor
delete flow expired_monitor
```

## Behavior

- Stops the flow immediately
- Removes the flow from the system
- Any in-flight data processing is interrupted
- Output streams continue to exist but receive no more data
- Operation is irreversible

## Use Cases

### Flow Management
Stop flows that are no longer needed.

### Testing
Clean up test flows after testing.

### Resource Management
Free up system resources by stopping unused flows.

### Maintenance
Stop flows during system maintenance.

### Error Recovery
Stop malfunctioning flows.

## Related Statements

- [create flow](./create-flow.md) - Create a new flow
- [list](./list.md) - List active flows 