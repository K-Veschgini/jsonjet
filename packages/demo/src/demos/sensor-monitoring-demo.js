export const sensorMonitoringDemo = `// Sensor Monitoring Demo
// Temperature monitoring with alerting

// 1. Create streams for sensor data and alerts
create stream sensor_data;
create stream alerts;

// 2. Create a flow that processes sensor data and generates alerts
create flow data_processor as
  sensor_data 
  | where temperature > 70 
  | select { 
      sensor_id: sensor_id,
      message: "temperature too high", 
      temperature: temperature, 
      timestamp: timestamp,
      level: iff(temperature>=100, 'danger', 'warning') 
    } 
  | insert_into(alerts);

// 3. Insert test sensor readings with different temperature levels
insert into sensor_data [
  { sensor_id: "sensor_1", temperature: 65, timestamp: "2024-01-01T10:00:00Z" },
  { sensor_id: "sensor_2", temperature: 85, timestamp: "2024-01-01T10:01:00Z" },
  { sensor_id: "sensor_3", temperature: 112, timestamp: "2024-01-01T10:02:00Z" }
];

// 4. Process all pending data through the flow
flush sensor_data;`;