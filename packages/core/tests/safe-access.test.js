import { describe, it, expect } from 'bun:test';
import { safeGet, safeSet, safeHas } from '../src/utils/safe-access.js';

describe('Safe Property Access', () => {
  const testObj = {
    name: 'John',
    age: 30,
    user: {
      address: {
        street: {
          name: 'Main St',
          number: 123
        },
        city: 'Boston'
      },
      profile: {
        email: 'john@example.com'
      }
    },
    tags: ['developer', 'javascript'],
    config: {
      theme: null,
      debug: false
    }
  };

  describe('safeGet', () => {
    it('should access simple properties', () => {
      expect(safeGet(testObj, 'name')).toBe('John');
      expect(safeGet(testObj, 'age')).toBe(30);
    });

    it('should access nested properties', () => {
      expect(safeGet(testObj, 'user.address.city')).toBe('Boston');
      expect(safeGet(testObj, 'user.address.street.name')).toBe('Main St');
      expect(safeGet(testObj, 'user.address.street.number')).toBe(123);
    });

    it('should return undefined for missing properties', () => {
      expect(safeGet(testObj, 'missing')).toBeUndefined();
      expect(safeGet(testObj, 'user.missing')).toBeUndefined();
      expect(safeGet(testObj, 'user.address.missing')).toBeUndefined();
      expect(safeGet(testObj, 'user.address.street.missing')).toBeUndefined();
    });

    it('should handle null values gracefully', () => {
      expect(safeGet(testObj, 'config.theme')).toBeNull();
      expect(safeGet(testObj, 'config.theme.color')).toBeUndefined();
    });

    it('should handle array access', () => {
      expect(safeGet(testObj, 'tags')).toEqual(['developer', 'javascript']);
    });

    it('should handle invalid inputs', () => {
      expect(safeGet(null, 'name')).toBeUndefined();
      expect(safeGet(undefined, 'name')).toBeUndefined();
      expect(safeGet(testObj, null)).toBeUndefined();
      expect(safeGet(testObj, undefined)).toBeUndefined();
      expect(safeGet(testObj, '')).toBeUndefined();
      expect(safeGet('not an object', 'name')).toBeUndefined();
    });

    it('should handle access on non-objects in path', () => {
      expect(safeGet(testObj, 'name.length.missing')).toBeUndefined();
      expect(safeGet(testObj, 'age.toString.missing')).toBeUndefined();
    });
  });

  describe('safeSet', () => {
    it('should set simple properties', () => {
      const obj = {};
      safeSet(obj, 'name', 'John');
      expect(obj.name).toBe('John');
    });

    it('should set nested properties', () => {
      const obj = {};
      safeSet(obj, 'user.address.city', 'Boston');
      expect(obj.user.address.city).toBe('Boston');
    });

    it('should create intermediate objects', () => {
      const obj = {};
      safeSet(obj, 'a.b.c.d', 'value');
      expect(obj.a.b.c.d).toBe('value');
      expect(typeof obj.a).toBe('object');
      expect(typeof obj.a.b).toBe('object');
      expect(typeof obj.a.b.c).toBe('object');
    });

    it('should handle existing nested objects', () => {
      const obj = { user: { profile: { name: 'existing' } } };
      safeSet(obj, 'user.profile.email', 'test@example.com');
      safeSet(obj, 'user.address.city', 'Boston');
      
      expect(obj.user.profile.name).toBe('existing');
      expect(obj.user.profile.email).toBe('test@example.com');
      expect(obj.user.address.city).toBe('Boston');
    });

    it('should handle invalid inputs gracefully', () => {
      expect(() => safeSet(null, 'name', 'value')).not.toThrow();
      expect(() => safeSet(undefined, 'name', 'value')).not.toThrow();
      expect(() => safeSet({}, null, 'value')).not.toThrow();
      expect(() => safeSet({}, undefined, 'value')).not.toThrow();
    });

    it('should not override non-object intermediates', () => {
      const obj = { user: 'string' };
      safeSet(obj, 'user.profile.name', 'John');
      expect(obj.user).toBe('string'); // Should remain unchanged
    });
  });

  describe('safeHas', () => {
    it('should check simple properties', () => {
      expect(safeHas(testObj, 'name')).toBe(true);
      expect(safeHas(testObj, 'age')).toBe(true);
      expect(safeHas(testObj, 'missing')).toBe(false);
    });

    it('should check nested properties', () => {
      expect(safeHas(testObj, 'user.address.city')).toBe(true);
      expect(safeHas(testObj, 'user.address.street.name')).toBe(true);
      expect(safeHas(testObj, 'user.missing.property')).toBe(false);
    });

    it('should treat null as not having the property', () => {
      expect(safeHas(testObj, 'config.theme')).toBe(false);
    });

    it('should treat false/0 as having the property', () => {
      expect(safeHas(testObj, 'config.debug')).toBe(true);
    });
  });
});