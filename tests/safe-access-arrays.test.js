import { describe, it, expect } from 'bun:test';
import { safeGet, safeSet, safeHas } from '../src/utils/safe-access.js';

describe('Safe Property Access - Arrays', () => {
  const testObj = {
    users: [
      { name: 'John', age: 30, hobbies: ['reading', 'gaming'] },
      { name: 'Jane', age: 25, hobbies: ['running', 'cooking', 'photography'] },
      { name: 'Bob', age: 35 }
    ],
    matrix: [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ],
    empty: [],
    nested: {
      items: [
        { id: 1, tags: ['red', 'blue'] },
        { id: 2, tags: ['green'] }
      ]
    }
  };

  describe('safeGet with arrays', () => {
    it('should access array elements by index', () => {
      expect(safeGet(testObj, 'users.0.name')).toBe('John');
      expect(safeGet(testObj, 'users.1.age')).toBe(25);
      expect(safeGet(testObj, 'users.2.name')).toBe('Bob');
    });

    it('should access nested array elements', () => {
      expect(safeGet(testObj, 'users.0.hobbies.0')).toBe('reading');
      expect(safeGet(testObj, 'users.1.hobbies.2')).toBe('photography');
      expect(safeGet(testObj, 'matrix.0.1')).toBe(2);
      expect(safeGet(testObj, 'matrix.2.2')).toBe(9);
    });

    it('should return undefined for out-of-bounds array access', () => {
      expect(safeGet(testObj, 'users.10')).toBeUndefined();
      expect(safeGet(testObj, 'users.0.hobbies.10')).toBeUndefined();
      expect(safeGet(testObj, 'matrix.5.0')).toBeUndefined();
      expect(safeGet(testObj, 'matrix.0.10')).toBeUndefined();
    });

    it('should handle empty arrays gracefully', () => {
      expect(safeGet(testObj, 'empty.0')).toBeUndefined();
      expect(safeGet(testObj, 'empty.5')).toBeUndefined();
    });

    it('should handle arrays inside nested objects', () => {
      expect(safeGet(testObj, 'nested.items.0.id')).toBe(1);
      expect(safeGet(testObj, 'nested.items.1.tags.0')).toBe('green');
      expect(safeGet(testObj, 'nested.items.0.tags.1')).toBe('blue');
    });

    it('should handle missing array properties gracefully', () => {
      expect(safeGet(testObj, 'users.2.hobbies')).toBeUndefined(); // Bob has no hobbies
      expect(safeGet(testObj, 'users.2.hobbies.0')).toBeUndefined();
    });

    it('should handle negative indices (JavaScript behavior)', () => {
      // JavaScript allows negative indices but they don't work as expected
      expect(safeGet(testObj, 'users.-1')).toBeUndefined();
      expect(safeGet(testObj, 'matrix.0.-1')).toBeUndefined();
    });

    it('should handle non-numeric string indices', () => {
      // Arrays can have string properties too
      const arrayWithProps = [1, 2, 3];
      arrayWithProps.customProp = 'value';
      
      const objWithCustomArray = { arr: arrayWithProps };
      
      expect(safeGet(objWithCustomArray, 'arr.0')).toBe(1);
      expect(safeGet(objWithCustomArray, 'arr.customProp')).toBe('value');
      expect(safeGet(objWithCustomArray, 'arr.nonExistent')).toBeUndefined();
    });
  });

  describe('safeSet with arrays', () => {
    it('should set array elements by index', () => {
      const obj = { arr: [1, 2, 3] };
      safeSet(obj, 'arr.1', 'modified');
      expect(obj.arr[1]).toBe('modified');
    });

    it('should extend arrays when setting out-of-bounds indices', () => {
      const obj = { arr: [1, 2] };
      safeSet(obj, 'arr.5', 'new');
      expect(obj.arr[5]).toBe('new');
      expect(obj.arr.length).toBe(6);
      expect(obj.arr[3]).toBeUndefined(); // Sparse array
    });

    it('should create nested array structures', () => {
      const obj = {};
      safeSet(obj, 'data.items.0.name', 'first');
      safeSet(obj, 'data.items.1.name', 'second');
      
      expect(obj.data.items[0].name).toBe('first');
      expect(obj.data.items[1].name).toBe('second');
    });
  });

  describe('safeHas with arrays', () => {
    it('should check array element existence', () => {
      expect(safeHas(testObj, 'users.0')).toBe(true);
      expect(safeHas(testObj, 'users.0.name')).toBe(true);
      expect(safeHas(testObj, 'users.10')).toBe(false);
      expect(safeHas(testObj, 'users.0.hobbies.0')).toBe(true);
      expect(safeHas(testObj, 'users.0.hobbies.10')).toBe(false);
    });

    it('should handle sparse arrays correctly', () => {
      const sparseArray = [];
      sparseArray[5] = 'value';
      const obj = { sparse: sparseArray };
      
      expect(safeHas(obj, 'sparse.0')).toBe(false);
      expect(safeHas(obj, 'sparse.5')).toBe(true);
    });
  });

  describe('edge cases with arrays', () => {
    it('should handle arrays as root objects', () => {
      const rootArray = [{ name: 'item1' }, { name: 'item2' }];
      
      expect(safeGet(rootArray, '0.name')).toBe('item1');
      expect(safeGet(rootArray, '1.name')).toBe('item2');
      expect(safeGet(rootArray, '5.name')).toBeUndefined();
    });

    it('should handle array-like objects', () => {
      const arrayLike = { 0: 'first', 1: 'second', length: 2 };
      const obj = { data: arrayLike };
      
      expect(safeGet(obj, 'data.0')).toBe('first');
      expect(safeGet(obj, 'data.1')).toBe('second');
      expect(safeGet(obj, 'data.length')).toBe(2);
    });

    it('should handle null/undefined in array chains', () => {
      const objWithNulls = {
        items: [
          { value: 10 },
          null,
          { value: 30 }
        ]
      };
      
      expect(safeGet(objWithNulls, 'items.0.value')).toBe(10);
      expect(safeGet(objWithNulls, 'items.1.value')).toBeUndefined(); // null.value
      expect(safeGet(objWithNulls, 'items.2.value')).toBe(30);
    });
  });
});