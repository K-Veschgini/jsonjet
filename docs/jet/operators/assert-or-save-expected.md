# assert_or_save_expected Operator

The `assert_or_save_expected` operator validates pipeline output against expected results.

## Syntax

```jsonjet
| assert_or_save_expected(<file_path>)
```

## Description

This operator serves as a testing mechanism that either compares current pipeline output with stored expected results or saves the current output for future validation. The behavior depends on whether the target file exists.

## Parameters

- `file_path`: String expression for the file path containing expected results

## Examples

### Basic Usage

```jsonjet
| assert_or_save_expected("expected_results.json")
| assert_or_save_expected("tests/test_case_1.json")
| assert_or_save_expected("validation/" + test_name + ".json")
```

### In Test Flows

```jsonjet
create flow test_aggregation as
  test_data
  | summarize { count: count(), sum: sum(value) } by category
  | assert_or_save_expected("expected_aggregation.json")

create flow test_filtering as
  sample_data
  | where value > 10
  | select { id, filtered_value: value }
  | assert_or_save_expected("expected_filtered.json")
```

### With Data Transformation

```jsonjet
create flow test_transformation as
  input_data
  | select { 
      id, 
      computed: value * 2,
      status: if(value > 5, "high", "low")
    }
  | assert_or_save_expected("expected_transformed.json")
```

## Testing Modes

### Assert Mode
When the expected file exists, the operator compares the current output with the expected results and fails if they don't match.

### Save Mode
When the expected file doesn't exist, the operator saves the current output as the expected results for future comparisons.



## File Format

The expected results file should contain the expected output in JSON format, typically an array of documents that match the pipeline output structure.

## Performance Considerations

- File I/O operations for comparison can be slow
- Large expected result files may impact performance
- Use in development and testing environments only
- Consider smaller test datasets for frequent testing

## Related Operators

- [WRITE_TO_FILE](./write-to-file.md) - General file output
- [SELECT](./select.md) - Data transformation for testing 