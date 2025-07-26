# JSONJet Syntax Highlighting Demo

This page demonstrates the new JSONJet syntax highlighting that has been implemented for the query language.

## Basic Query Operations

```jsonjet
// Create streams for testing
create or replace stream user_data;
create or replace stream analytics_output;

// Basic pipeline with where and select
create flow user_analytics as
user_data 
  | where age >= 18 && status == "active"
  | select { 
      name: name, 
      age: age, 
      is_adult: age >= 18,
      full_name: name + " " + surname 
    }
  | assert_or_save_expected("tests/expected/user-analytics.ndjson");
```

## Scan Operations with State Management

```jsonjet
// Session tracking with scan operator
create flow session_tracker as
events 
  | scan(
      step start_session: event_type == "login" => 
        user_id = user_id, 
        session_start = timestamp,
        session_id = matchId;
      step track_activity: event_type == "action" => 
        action_count = action_count + 1,
        last_activity = timestamp;
      step end_session: event_type == "logout" => 
        session_duration = timestamp - session_start,
        emit({
          user_id: user_id,
          session_id: session_id,
          session_duration: session_duration,
          total_actions: action_count
        });
    );
```

## Summarize with Window Functions

```jsonjet
// Running analytics with window functions
create flow running_analytics as
sensor_data 
  | summarize { 
      avg_temp: avg(temperature),
      max_temp: max(temperature),
      count: count()
    } 
    by location 
    over tumbling_window(5m)
  | where avg_temp > 25;
```

## Array Access and Object Manipulation

```jsonjet
// Array indexing and object spread
create flow data_transform as
raw_data 
  | select { 
      ...*,  // Spread all existing fields
      first_item: items[0],
      item_count: items.length,
      processed: true
    }
  | where first_item != null;
```

## Object Property Key Highlighting

```jsonjet
// Notice how only the keys are highlighted in blue, not the values
create flow user_profile as
user_data 
  | select { 
      name: name,           // Only "name:" is blue
      age: age,             // Only "age:" is blue  
      is_adult: age >= 18,  // Only "is_adult:" is blue
      full_name: name + " " + surname  // Only "full_name:" is blue
    }
  | where is_adult == true;
```

## Built-in Functions

```jsonjet
// Using built-in mathematical and comparison functions
create flow calculations as
metrics 
  | select {
      abs_value: abs(value),
      power: pow(value, 2),
      modulo: mod(value, 10),
      is_positive: value > 0,
      conditional: iff(value > 100, "high", "normal")
    };
```

## Dot Commands

```jsonjet
// System commands
.list streams;
.info flow user_analytics;
.print "Processing complete";
```

## Complex Expressions

```jsonjet
// Complex boolean expressions and arithmetic
create flow complex_logic as
data 
  | where (status == "active" || status == "pending") && 
          (age >= 18 && age <= 65) &&
          (score > 0.8 || priority == "high")
  | select {
      risk_score: (age * 0.1) + (score * 100),
      category: iff(age < 30, "young", iff(age < 50, "middle", "senior")),
      is_eligible: age >= 18 && score >= 0.7
    };
```

## Window Functions

```jsonjet
// Different types of window functions
create flow window_examples as
events 
  | summarize { count: count() } 
    over hopping_window(1m, 30s)
  | summarize { sum: sum(value) } 
    over sliding_window(5m)
  | summarize { avg: avg(metric) } 
    over tumbling_window(10m)
  | summarize { distinct: count(distinct user_id) } 
    over session_window(user_id, 30m);
```

## Emit Control

```jsonjet
// Emit control in summarize operations
create flow emit_control as
sensor_data 
  | summarize { 
      avg_temp: avg(temperature),
      count: count()
    } 
    emit every 10  // Emit every 10 records
  | summarize { 
      total: sum(count)
    } 
    emit when count > 100;  // Emit when condition is met
```

This enhanced syntax highlighting supports all the features of the JSONJet query language with **granular color distinctions**:

### 🎨 **Color-Coded Keywords:**

- **🔴 Declaration Keywords** (`create`, `insert`, `delete`, `flush`, `list`, `info`, `subscribe`, `unsubscribe`, `print`) - Red
- **🟠 Query Keywords** (`where`, `select`, `scan`, `summarize`, `collect`, `by`, `over`, `step`, `emit`) - Orange  
- **🟣 Flow Keywords** (`stream`, `flow`, `lookup`, `as`, `into`, `ttl`) - Purple
- **🔵 Control Keywords** (`or`, `replace`, `if`, `not`, `exists`, `every`, `when`, `on`, `change`, `group`, `update`, `using`) - Blue
- **🟣 Window Keywords** (`hopping_window`, `tumbling_window`, `sliding_window`, `count_window`, etc.) - Purple
- **🔵 Boolean Literals** (`true`, `false`, `null`) - Blue

### 🔧 **Functions & Operators:**

- **🟣 Regular Functions** (`count()`, `sum()`, `avg()`, `min()`, `max()`, etc.) - Purple
- **🟠 Special Functions** (`iff()`, `assert_or_save_expected()`, `write_to_file()`, `insert_into()`) - Orange
- **⚫ Operators** (`|`, `=>`, `==`, `!=`, `<=`, `>=`, `<`, `>`, `=`, `+`, `-`, `*`, `/`, `%`, `&&`, `||`, `...`, `?`, `:`) - Bold Black

### 📝 **Data & Structure:**

- **🔵 Object Property Keys** (`name:`, `age:`, `email:`, etc.) - **Blue and Bold** ✨ (only the key part is highlighted)
- **🔵 Regular Identifiers** (variable names) - Blue
- **🟢 Strings** - Green
- **🔵 Numbers** - Blue
- **🟢 Comments** - Green (italic)

### 🌙 **Theme Support:**

- **Light Theme**: GitHub-inspired colors for optimal readability
- **Dark Theme**: VS Code-inspired colors for comfortable viewing

The highlighting now provides **maximum visual distinction** between different language constructs, making JSONJet queries much easier to read and understand! 🎉 