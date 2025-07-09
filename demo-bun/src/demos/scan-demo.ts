export const scanDemo = `// JSDB Scan Operator Demo
// Learn how to use the scan operator for stateful stream processing

// 1. Create streams for our demo
create or replace stream events;
create or replace stream sessions;
create or replace stream analytics;

// 2. Session Tracking with Scan Operator
// Track user sessions from login to logout events
create flow session_tracker from events 
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
        user_id = user_id,
        session_id = session_id,
        total_actions = action_count,
        emit({
          user_id: user_id,
          session_id: session_id,
          session_duration: session_duration,
          total_actions: total_actions,
          session_start: session_start,
          last_activity: last_activity
        });
    )
  | insert_into(sessions);

// 3. Running Analytics with Scan Operator
// Calculate running totals and averages
create flow running_analytics from events 
  | scan(
      step accumulate: value > 0 => 
        total = total + value,
        count = count + 1,
        avg = total / count,
        max_value = value > max_value ? value : max_value,
        emit({
          total: total,
          count: count,
          avg: avg,
          max_value: max_value,
          current_value: value
        });
    )
  | insert_into(analytics);

// 4. Insert session events (flows will process these immediately)
insert into events { timestamp: 1000, event_type: "login", user_id: "alice", value: null };
insert into events { timestamp: 1010, event_type: "action", user_id: "alice", value: 5 };
insert into events { timestamp: 1020, event_type: "action", user_id: "alice", value: 10 };
insert into events { timestamp: 1030, event_type: "logout", user_id: "alice", value: null };

// 5. Insert more events for different user
insert into events { timestamp: 1040, event_type: "login", user_id: "bob", value: null };
insert into events { timestamp: 1050, event_type: "action", user_id: "bob", value: 15 };
insert into events { timestamp: 1060, event_type: "action", user_id: "bob", value: 20 };
insert into events { timestamp: 1070, event_type: "logout", user_id: "bob", value: null };

// 6. Insert some analytics events
insert into events { timestamp: 2000, event_type: "metric", user_id: null, value: 100 };
insert into events { timestamp: 2010, event_type: "metric", user_id: null, value: 200 };
insert into events { timestamp: 2020, event_type: "metric", user_id: null, value: 150 };

// 7. Check results
list flows;`;