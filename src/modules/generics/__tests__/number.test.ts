import { assertEquals } from "https://deno.land/std@0.143.0/testing/asserts.ts";
import { isNumber, range } from '../number.ts';

Deno.test({
  name: 'modules/generics/number/isNumber',
  async fn ({ step }) {
    await step('should return true if provided value is a number', () => {
      assertEquals(isNumber(0), true, 'zero');
      assertEquals(isNumber(1), true, 'positive numbers');
      assertEquals(isNumber(-1), true, 'negative numbers');
    });
    const tests: [string, unknown][] = [
      ['undefined', undefined],
      ['null', null],
      ['string', 'hello'],
      ['empty string', ''],
      ['false', false],
      ['true', true],
      ['symbol', Symbol('hello')],
      ['object', { a: 'woah' }],
      ['empty object', {}],
      ['array', ['hello']],
      ['empty array', []],
      ['NaN', NaN],
    ];
    await Promise.all(tests.map(([label, value]) => {
      step({
        name: `should return false if provided "${label}"`,
        fn() {
          assertEquals(isNumber(value), false)
        }, 
        sanitizeOps: false,
        sanitizeResources: false,
        sanitizeExit: false,
      });
    }));
  }
})

Deno.test({
  name: 'modules/generics/number/range',
  async fn({ step }) {
    await step('should yield each number between the two provided numbers', () => {
      const item = range(4, 8)
      assertEquals(item.next().value, 4)
      assertEquals(item.next().value, 5)
      assertEquals(item.next().value, 6)
      assertEquals(item.next().value, 7)
    });

    await step('should yield each number between the 0 and provided number if only one was provided', () => {
      const item = range(3)
      assertEquals(item.next().value, 0)
      assertEquals(item.next().value, 1)
      assertEquals(item.next().value, 2)
    });
  }
})