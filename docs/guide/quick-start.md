# Quick Start

Get started with JSONJet in just a few minutes.

## Installation

```bash
npm install jsonjet
```

## Basic Usage

### 1. Create a Stream

```sql
create stream sensor_data
```

### 2. Create a Flow

```sql
create flow temperature_monitor as
  sensor_data
  | where temperature > 30
  | select { 
      timestamp: timestamp,
      temperature: temperature,
      alert: "High temperature detected"
    }
```

### 3. Insert Data

```sql
insert into sensor_data {
  "timestamp": 1640995200000,
  "temperature": 35.5,
  "humidity": 60
}
```

### 4. Working with Arrays

```sql
-- Insert array data
insert into test_data {"scores": [85, 92, 78, 95]}

-- Query array elements
create flow analysis as
  test_data
  | select {
      firstScore: scores[0],
      averageScore: (scores[0] + scores[1] + scores[2] + scores[3]) / 4
    }
```

### 5. Using Lookups

```sql
-- Create lookup values
create lookup high_temp_threshold = 30
create lookup alert_message = "Temperature warning"

-- Use in queries
create flow alerts as
  sensor_data
  | where temperature > high_temp_threshold
  | select {
      message: alert_message,
      value: temperature
    }
```

## What's Next?

You're now ready to start building with JSONJet! Check out the [API Reference](/api/) for more detailed information.