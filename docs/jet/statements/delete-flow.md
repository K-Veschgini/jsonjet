# delete flow Statement

The `delete flow` statement terminates and removes a processing flow.

## Syntax

```jsonjet
delete flow <flow_name>
```

## Description

This statement immediately stops a running flow and removes it from the system. The termination interrupts any in-flight processing and cannot be reversed.

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



## Related Statements

- [create flow](./create-flow.md) - Create a new flow
- [list](./list.md) - List active flows 