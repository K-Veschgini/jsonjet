# scan Operator

The `scan` operator provides stateful processing with step-based logic.

## Syntax

```jsonjet
| scan(
    step <name>: <condition> => <statements>,
    step <name>: <condition> => <statements>
  )
```

## Description

The `SCAN` operator enables stateful processing by maintaining variables across document processing. Each step defines a condition and associated statements that execute when the condition is true.

## Parameters

- `name`: Step identifier (must be a valid identifier)
- `condition`: Boolean expression that determines when the step executes
- `statements`: Comma-separated list of assignments and function calls

## Step Statements

### Assignment Statement

```jsonjet
variable = expression
```

Assigns the result of an expression to a variable.

### Function Call Statement

```jsonjet
function_name(arguments)
```

Calls a function with the specified arguments.

## Examples

### Simple Counter

```jsonjet
| scan(
    step init: true => count = 0,
    step increment: true => count = count + 1
  )
```

### State Machine

```jsonjet
| scan(
    step start: type = "start" => running = true, processed = 0,
    step process: running => processed = processed + 1,
    step end: type = "end" => running = false
  )
```

### Accumulator Pattern

```jsonjet
| scan(
    step init: true => total = 0, count = 0,
    step accumulate: true => total = total + value, count = count + 1,
    step finalize: is_last => avg = total / count
  )
```

### Complex State Logic

```jsonjet
| scan(
    step initialize: true => 
      session_id = null, 
      start_time = null, 
      events = [],
    step start_session: event_type = "login" => 
      session_id = generate_id(), 
      start_time = timestamp,
    step add_event: session_id is not null => 
      events = events.concat({ event_type, timestamp }),
    step end_session: event_type = "logout" => 
      session_id = null, 
      start_time = null
  )
```

### Conditional Processing

```jsonjet
| scan(
    step init: true => 
      high_temp_count = 0, 
      low_temp_count = 0,
    step count_high: temperature > 25 => 
      high_temp_count = high_temp_count + 1,
    step count_low: temperature <= 25 => 
      low_temp_count = low_temp_count + 1,
    step alert: high_temp_count > 10 => 
      send_alert("High temperature threshold exceeded")
  )
```

### Data Aggregation

```jsonjet
| scan(
    step setup: true => 
      groups = {}, 
      totals = {},
    step group_by_id: true => 
      groups[id] = groups[id] || [], 
      groups[id].push(value),
    step calculate_totals: is_last => 
      totals = Object.keys(groups).map(id => ({
        id, 
        count: groups[id].length, 
        sum: groups[id].reduce((a, b) => a + b, 0)
      }))
  )
```

## Advanced Patterns

### Multi-Step Validation

```jsonjet
| scan(
    step validate_start: true => 
      errors = [], 
      warnings = [],
    step check_required: missing(required_field) => 
      errors.push("Missing required field"),
    step check_format: invalid_format(field) => 
      warnings.push("Invalid format"),
    step check_range: value < min or value > max => 
      errors.push("Value out of range"),
    step finalize: true => 
      is_valid = errors.length === 0
  )
```

### Event Correlation

```jsonjet
| scan(
    step init_correlation: true => 
      correlation_window = 5m, 
      events_buffer = [],
    step add_event: true => 
      events_buffer.push({ event, timestamp }),
    step cleanup_old: true => 
      events_buffer = events_buffer.filter(e => 
        timestamp - e.timestamp < correlation_window
      ),
    step correlate: events_buffer.length >= 3 => 
      correlated_events = find_correlation(events_buffer)
  )
```

### Rate Limiting

```jsonjet
| scan(
    step init_rate_limit: true => 
      request_count = 0, 
      window_start = timestamp,
    step check_window: timestamp - window_start > 1m => 
      request_count = 0, 
      window_start = timestamp,
    step increment_count: true => 
      request_count = request_count + 1,
    step rate_limit: request_count > 100 => 
      rate_limited = true
  )
```

## Variable Scope

- Variables declared in steps persist across all documents
- Variables are accessible in subsequent steps and in the output
- Variables can be referenced in conditions and expressions
- Variables are reset when the scan operator completes

## Performance Considerations

- Each step condition is evaluated for every document
- Complex state logic can impact performance
- Consider using multiple SCAN operators for complex state machines
- Variables are kept in memory for the duration of processing

## Related Operators

- [WHERE](./where.md) - Filter documents before stateful processing
- [SUMMARIZE](./summarize.md) - Aggregate data with built-in state management 