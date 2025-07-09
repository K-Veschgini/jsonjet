export const scanAdvancedDemo = `// Advanced Scan Operator Demo
// Complex event pattern matching and state management

// 1. Create streams for advanced patterns
create or replace stream trading_events;
create or replace stream pattern_matches;
create or replace stream anomalies;

// 2. Trading Pattern Detection
// Detect "buy-dip" patterns: price drops then recovers
create flow trading_pattern from trading_events 
  | scan(
      step detect_drop: price_change < -5 => 
        drop_start = timestamp,
        drop_price = price,
        symbol = symbol;
      step confirm_dip: price < drop_price => 
        lowest_price = price < lowest_price ? price : lowest_price,
        dip_duration = timestamp - drop_start;
      step recovery: price > drop_price * 1.02 => 
        recovery_price = price,
        pattern_type = "buy_dip",
        profit_potential = (recovery_price - lowest_price) / lowest_price * 100,
        total_duration = timestamp - drop_start,
        emit({
          symbol: symbol,
          pattern_type: pattern_type,
          drop_start: drop_start,
          drop_price: drop_price,
          lowest_price: lowest_price,
          recovery_price: recovery_price,
          profit_potential: profit_potential,
          total_duration: total_duration
        });
    )
  | insert_into(pattern_matches);

// 3. Anomaly Detection with Scan
// Detect unusual activity patterns
create flow anomaly_detector from trading_events 
  | scan(
      step baseline: true => 
        volume_sum = volume_sum + volume,
        price_sum = price_sum + price,
        count = count + 1,
        avg_volume = volume_sum / count,
        avg_price = price_sum / count;
      step detect_anomaly: volume > avg_volume * 3 && abs(price - avg_price) > avg_price * 0.1 => 
        anomaly_type = "volume_price_spike",
        volume_ratio = volume / avg_volume,
        price_deviation = abs(price - avg_price) / avg_price * 100,
        severity = volume_ratio * price_deviation,
        emit({
          symbol: symbol,
          timestamp: timestamp,
          anomaly_type: anomaly_type,
          volume: volume,
          price: price,
          avg_volume: avg_volume,
          avg_price: avg_price,
          volume_ratio: volume_ratio,
          price_deviation: price_deviation,
          severity: severity
        });
    )
  | insert_into(anomalies);

// 4. Insert trading events for pattern detection
insert into trading_events { timestamp: 1000, symbol: "AAPL", price: 150, volume: 1000, price_change: 0 };
insert into trading_events { timestamp: 1010, symbol: "AAPL", price: 145, volume: 1200, price_change: -5 };
insert into trading_events { timestamp: 1020, symbol: "AAPL", price: 142, volume: 1500, price_change: -3 };
insert into trading_events { timestamp: 1030, symbol: "AAPL", price: 140, volume: 1800, price_change: -2 };
insert into trading_events { timestamp: 1040, symbol: "AAPL", price: 144, volume: 2000, price_change: 4 };
insert into trading_events { timestamp: 1050, symbol: "AAPL", price: 148, volume: 2500, price_change: 4 };
insert into trading_events { timestamp: 1060, symbol: "AAPL", price: 153, volume: 1800, price_change: 5 };

// 5. Insert events for anomaly detection
insert into trading_events { timestamp: 2000, symbol: "TSLA", price: 200, volume: 1000, price_change: 0 };
insert into trading_events { timestamp: 2010, symbol: "TSLA", price: 202, volume: 1100, price_change: 2 };
insert into trading_events { timestamp: 2020, symbol: "TSLA", price: 205, volume: 1200, price_change: 3 };
insert into trading_events { timestamp: 2030, symbol: "TSLA", price: 225, volume: 5000, price_change: 20 };

// 6. Check what patterns were detected
list flows;`;