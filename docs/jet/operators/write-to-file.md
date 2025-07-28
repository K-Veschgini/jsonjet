# write_to_file Operator

The `write_to_file` operator writes data to a file.

## Syntax

```jsonjet
| write_to_file(<file_path> [, <options>])
```

## Description

The `WRITE_TO_FILE` operator writes documents from the pipeline to a specified file. This is useful for data export, logging, and archival purposes.

## Parameters

- `file_path`: String expression for the file path
- `options`: Optional object with file writing options

## Examples

### Basic Usage

```jsonjet
| write_to_file("output.json")
| write_to_file("logs/events.log")
| write_to_file("data/" + date + ".json")
```

### With Options

```jsonjet
| write_to_file("output.json", { format: "json" })
| write_to_file("data.csv", { format: "csv", delimiter: "," })
| write_to_file("logs.txt", { append: true })
```

### Dynamic File Paths

```jsonjet
| write_to_file("logs/" + year + "/" + month + "/events.json")
| write_to_file("exports/" + product_id + "_data.json")
| write_to_file("backup/" + timestamp + ".json")
```

### In Complete Flows

```jsonjet
create flow data_export as
  sensor_data
  | where temperature > 25
  | select { id, temp: temperature, timestamp }
  | write_to_file("high_temp_events.json")

create flow log_processor as
  application_logs
  | where level = "error"
  | write_to_file("error_logs.json", { append: true })
```

## File Options

### Format Options
- `format: "json"` - JSON format (default)
- `format: "csv"` - CSV format
- `format: "ndjson"` - Newline-delimited JSON

### Writing Options
- `append: true` - Append to existing file
- `append: false` - Overwrite existing file (default)

### CSV Options
- `delimiter: ","` - Field delimiter
- `headers: true` - Include column headers

## Use Cases

### Data Export
Export processed data to files for external systems.

### Logging
Write filtered or transformed logs to files.

### Data Archival
Archive processed data to persistent storage.

### Debugging
Write intermediate pipeline results for debugging.

## Performance Considerations

- File I/O can be slow for high-volume data
- Consider using appropriate file formats for your use case
- Large files may impact system performance
- Use append mode carefully to avoid file corruption

## Related Operators

- [INSERT_INTO](./insert-into.md) - Route data to streams
- [ASSERT_OR_SAVE_EXPECTED](./assert-or-save-expected.md) - Testing output 