/**
 * Array Indexing Demo - Testing SELECT with array operations
 * 
 * This demo shows how to use array indexing in SELECT clauses with ResonanceDB.
 * We'll test various array access patterns and edge cases.
 */

export const runArrayIndexingDemo = `// ResonanceDB Array Indexing Demo
// Learn how to access array elements in SELECT clauses

// ====================================================
// SETUP: Create streams for testing (using or replace to handle existing streams)
// ====================================================

create or replace stream users;
create or replace stream results;

// ====================================================
// TEST 1: Basic Array Indexing
// ====================================================

// Create flow to access first, second, and third elements of arrays
create or replace flow basic_indexing as
users 
| select { 
    id: id, 
    name: name, 
    firstScore: scores[0], 
    secondScore: scores[1],
    thirdScore: scores[2],
    firstHobby: hobbies[0]
  } 
| insert_into(results);

// Now insert test data to see the flow in action
// User 1 - Alice with multiple arrays
insert into users {
  "id": 1,
  "name": "Alice", 
  "scores": [85, 92, 78, 95],
  "hobbies": ["reading", "coding", "hiking"],
  "contacts": {
    "emails": ["alice@work.com", "alice@personal.com"],
    "phones": ["555-1234", "555-5678"]
  },
  "projects": [
    {"name": "WebApp", "status": "active", "team": ["Alice", "Bob"]},
    {"name": "MobileApp", "status": "complete", "team": ["Alice", "Carol"]}
  ]
};

// User 2 - Bob with shorter arrays  
insert into users {
  "id": 2,
  "name": "Bob",
  "scores": [88, 76, 91], 
  "hobbies": ["gaming", "music"],
  "contacts": {
    "emails": ["bob@company.com"],
    "phones": ["555-9999"]
  },
  "projects": [
    {"name": "API", "status": "planning", "team": ["Bob", "Dave"]}
  ]
};

// User 3 - Carol with empty arrays and edge cases
insert into users {
  "id": 3,
  "name": "Carol",
  "scores": [95, 98, 93, 87, 92],
  "hobbies": [],
  "contacts": {
    "emails": [],
    "phones": ["555-0000", "555-1111", "555-2222"]
  },
  "projects": []
};

// ====================================================
// TEST 2: Nested Object Array Access  
// ====================================================

// Create flow to access arrays inside nested objects
create or replace flow nested_indexing as
users 
| select { 
    id: id, 
    name: name, 
    firstEmail: contacts.emails[0],
    secondPhone: contacts.phones[1],
    thirdPhone: contacts.phones[2]
  } 
| insert_into(results);

// The data inserted above will flow through this new pipeline

// ====================================================
// TEST 3: Complex Object Array Access
// ====================================================

// Create flow to access properties of objects within arrays
create or replace flow complex_indexing as
users 
| select { 
    id: id, 
    name: name, 
    firstProject: projects[0].name,
    firstProjectStatus: projects[0].status,
    firstTeamMember: projects[0].team[0],
    secondTeamMember: projects[0].team[1]
  } 
| insert_into(results);

// The existing data will automatically flow through this pipeline

// ====================================================
// TEST 4: Edge Cases (Out of Bounds, Empty Arrays)
// ====================================================

// Create flow to test what happens with invalid indices
create or replace flow edge_cases as
users 
| select { 
    id: id, 
    name: name, 
    outOfBounds: scores[10],        // Beyond array length
    emptyHobby: hobbies[0],         // From empty array
    emptyEmail: contacts.emails[0]  // From empty nested array
  } 
| insert_into(results);

// ====================================================
// TEST 5: Variable/Dynamic Indexing
// ====================================================

// Create flow that uses variables as array indices
create or replace flow variable_indexing as
users 
| select { 
    id: id, 
    name: name, 
    scoreAtIndex: scores[scoreIndex],
    hobbyAtIndex: hobbies[hobbyIndex]
  } 
| insert_into(results);

// Now insert test data with index variables
insert into users {
  "id": 4,
  "name": "Dave",
  "scores": [75, 82, 89],
  "scoreIndex": 1,
  "hobbies": ["swimming", "running"],
  "hobbyIndex": 0
};

// ====================================================
// SUMMARY OF ARRAY INDEXING CAPABILITIES
// ====================================================

// ✅ SUPPORTED:
// - Basic indexing: array[0], array[1], array[2]
// - Nested object arrays: obj.array[0] 
// - Deep nested access: obj.array[0].prop
// - Complex chaining: obj.array[0].subarray[1]
// - Variable indexing: array[variable]
// - Out-of-bounds handling: returns undefined
// - Empty array handling: returns undefined
//
// ❌ NOT SUPPORTED YET:
// - Negative indexing: array[-1] (last element)
// - Array slicing: array[1:3]  
// - Array methods: array.length, array.slice()
//
// 📝 NOTES:
// - Out-of-bounds access returns undefined (safe)
// - Empty arrays return undefined for any index
// - Variable indices work with any numeric field
// - Nested access chains work at any depth

// View results to see array indexing in action
flush results;`;