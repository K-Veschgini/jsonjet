import { transpileQuery } from './demo-bun/src/jsdb/parser/query-transpiler.js';

const query = 'user_data | select { ...*, -password, -ssn, safe_age: age } | insert_into(excluded_output)';

try {
  const result = transpileQuery(query);
  console.log('Transpiled JavaScript:');
  console.log(result.javascript);
  
  // Debug: check excludeField in CST
  const selectObject = result.cst.children.operation[0].children.selectClause[0].children.selectObject[0];
  console.log('\nExcludeField in CST:');
  console.log(selectObject.children.excludeField);
} catch (error) {
  console.error('Transpilation error:', error.message);
}