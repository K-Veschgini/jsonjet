import { describe, it, expect, beforeEach } from 'bun:test';
import { Select } from '../src/operators/select.js';

describe('Select Operator', () => {
  let selectOperator;
  let results;
  let mockDownstream;

  beforeEach(() => {
    results = [];
    // Create a mock downstream operator to capture emitted data
    mockDownstream = {
      push: (doc) => {
        results.push(doc);
      }
    };
  });

  it('should select specific fields from document', async () => {
    // Create select operator that picks specific fields
    selectOperator = new Select((doc) => ({
      name: doc.name,
      age: doc.age
    }));

    // Connect to mock downstream
    selectOperator.downstream = mockDownstream;

    // Process a document
    await selectOperator.process({
      name: 'John',
      age: 30,
      city: 'New York',
      country: 'USA'
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      name: 'John',
      age: 30
    });
  });

  it('should transform and rename fields', async () => {
    // Create select operator that transforms fields
    selectOperator = new Select((doc) => ({
      fullName: doc.firstName + ' ' + doc.lastName,
      isAdult: doc.age >= 18,
      location: doc.city
    }));

    selectOperator.downstream = mockDownstream;

    await selectOperator.process({
      firstName: 'Jane',
      lastName: 'Doe',
      age: 25,
      city: 'Boston',
      zipCode: '02101'
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      fullName: 'Jane Doe',
      isAdult: true,
      location: 'Boston'
    });
  });

  it('should handle spread-like operations (simulate ...* syntax)', async () => {
    // Create select operator that mimics {...*, newField: value} syntax
    selectOperator = new Select((doc) => ({
      ...doc,  // Spread all existing fields
      computed: doc.price * doc.quantity,
      category: 'electronics'
    }));

    selectOperator.downstream = mockDownstream;

    await selectOperator.process({
      name: 'Laptop',
      price: 1000,
      quantity: 2
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      name: 'Laptop',
      price: 1000,
      quantity: 2,
      computed: 2000,
      category: 'electronics'
    });
  });

  it('should handle complex field selection and computation', async () => {
    selectOperator = new Select((doc) => ({
      id: doc.id,
      revenue: doc.price * doc.quantity,
      discountedPrice: doc.price * (1 - doc.discount),
      metadata: {
        processed: true,
        timestamp: new Date().toISOString()
      }
    }));

    selectOperator.downstream = mockDownstream;

    await selectOperator.process({
      id: 'prod_001',
      price: 100,
      quantity: 3,
      discount: 0.1,
      name: 'Widget'
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('prod_001');
    expect(results[0].revenue).toBe(300);
    expect(results[0].discountedPrice).toBe(90);
    expect(results[0].metadata.processed).toBe(true);
    expect(results[0].metadata.timestamp).toBeDefined();
  });
});