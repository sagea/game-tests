import { p } from '../util'

describe('utils', () => {
  describe('p', () => {
    test('p should handle nothing', () => {
      const gs = {};
      const result = p()(gs);
      expect(result).toEqual(gs);
    })
    test.only('p should handle empty generator', () => {
      const gs = {};
      const result = p(
        function* () { }
      )(gs);
      expect(result).toEqual(gs);
    })
    test('p should handle methods', () => {
      const gs = {}
      const result = p(
        (gs) => ({ ...gs, a: true }),
        (gs) => ({ ...gs, b: true })
      )(gs)
      expect(result).toEqual({ a: true, b: true });
    })
    test('p should handle deeply nested arrays', () => {
      const gs = {}
      const result = p([[[[[[
        (gs) => ({ ...gs, a: true }),
        (gs) => ({ ...gs, b: true })
      ]]]]]])(gs)
      expect(result).toEqual({ a: true, b: true });
    })
    test('p Full test', () => {
      const c = (key) => (gs) => ({ ...gs, [key]: true });
      const gs = {}
      const result = p([[[[[[
        c('a'),
        c('b')
      ]],
      function* () { },
      ]],
      function* () {
        yield c('c')
        yield [
          c('d'),
          [[[function* () { yield c('e') }]]]
        ]
      }
      ]])(gs)
      expect(result).toEqual({ a: true, b: true, c: true, d: true, e: true });
    })
  })
})