import { from, zero } from '../Vector.ts';

describe('Vector.test.js', () => {
  describe('from', () => {
    it('should create a vector from a single number', () => {
      expect(from(1)).toEqual([1, 1])
    });
    it('should create a vector from two numbers', () => {
      expect(from(1, 5)).toEqual([1, 5])
    });
    it('should clone a vector', () => {
      const a = from(1, 2);
      expect(from(a)).toEqual([1, 2]);
      expect(from(a)).not.toBe(a); // should clone and not be the exact same
    });
  });
  describe('zero', () => {
    it('should return a vector zero', () => {
      expect(zero()).toEqual([0, 0]);
    })
  })
})