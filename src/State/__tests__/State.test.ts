import { SExtend, SExtendValue, SFilterValues, SMapExtendValues, SMapValues, State, SValue } from '../State.ts'

describe('State.ts', () => {
  describe('State', () => {
    test('initial state', () => {
      const item = State({})
      expect(item()).toEqual({})
    })
    test('should manage state and provide a return function that acts as a getter or setter', () => {
      const num = State(10);
      expect(num()).toEqual(10);
      expect(num(15)).toEqual(15);
      expect(num()).toEqual(15);
      expect(num((previousValue) => previousValue + 30)).toEqual(45)
      expect(num()).toEqual(45);
    })
  })
  describe('SExtend', () => {
    test('Should extend the State object', () => {
      const item = State<Record<string, any>>({ id: 'woah' });
      item(SExtend({ woah: 'bro' }))
      expect(item()).toEqual({ id: 'woah', woah: 'bro' });
      item(SExtend(({ woah }) => ({ woah: woah + 'hehe' })))
      expect(item()).toEqual({ id: 'woah', woah: 'brohehe' });
    })
  })
  describe('SValue', () => {
    describe('should update a State object property value by id', () => {
      test('to the return value if a function is provided', () => {
        interface Test { num: number, a: string };
        const item = State<Record<string, Test>>({
          coolBro: { num: 5, a: 'haha' },
          other: { num: 2, a: 'hehe' }
        })
        item(SValue('coolBro', ({ num, a }) => {
          return { num: num + 2, a: a + '2' }
        }))
        expect(item()).toEqual({
          coolBro: { num: 7, a: 'haha2' },
          other: { num: 2, a: 'hehe' },
        })
      })
      test('to the provided value if given a non function', () => {
        interface Test { num: number, a: string };
        const item = State<Record<string, Test>>({
          coolBro: { num: 5, a: 'haha' },
          other: { num: 2, a: 'hehe' }
        })
        item(SValue('coolBro', { num: 1, a: 'bro' }));
        expect(item()).toEqual({
          coolBro: { num: 1, a: 'bro' },
          other: { num: 2, a: 'hehe' },
        })
      })
    })
    describe('should create a new entry if prop doesn`t exist', () => {
      test('from function', () => {
        interface Test { num: number, a: string };
        const item = State<Record<string, Test>>({
          coolBro: { num: 5, a: 'haha' },
          other: { num: 2, a: 'hehe' }
        })
        item(SValue('woahSomethingDifferent', () => ({ num: 1, a: 'bro' })));
        expect(item()).toEqual({
          coolBro: { num: 5, a: 'haha' },
          woahSomethingDifferent: { num: 1, a: 'bro' },
          other: { num: 2, a: 'hehe' },
        })
      })
      test('from provided value', () => {
        interface Test { num: number, a: string };
        const item = State<Record<string, Test>>({
          coolBro: { num: 5, a: 'haha' },
          other: { num: 2, a: 'hehe' }
        })
        item(SValue('woahSomethingDifferent', { num: 1, a: 'bro' }));
        expect(item()).toEqual({
          coolBro: { num: 5, a: 'haha' },
          woahSomethingDifferent: { num: 1, a: 'bro' },
          other: { num: 2, a: 'hehe' },
        })
      })
    })

  })
  describe('SExtendValue', () => {
    test('should extend value with response from function', () => {
      interface Test { num: number, a: string };
      const item = State<Record<string, Test>>({
        coolBro: { num: 5, a: 'haha' },
        other: { num: 2, a: 'hehe' }
      })
      item(SExtendValue('other', ({ num }) => ({ num: num + 2 })))
      expect(item()).toEqual({
        coolBro: { num: 5, a: 'haha' },
        other: { num: 4, a: 'hehe' }
      });
    })
    test('should extend value with response from value', () => {
      interface Test { num: number, a: string };
      const item = State<Record<string, Test>>({
        coolBro: { num: 5, a: 'haha' },
        other: { num: 2, a: 'hehe' }
      })
      item(SExtendValue('other', { num: 7 }))
      expect(item()).toEqual({
        coolBro: { num: 5, a: 'haha' },
        other: { num: 7, a: 'hehe' }
      });
    })
  })
  describe('SFilterValues', () => {
    it('Should loop through each value of object and remove any key values if the provided handler returns false', () => {
      interface Test { num: number, a: string };
      const item = State<Record<string, Test>>({
        coolBro: { num: 5, a: 'haha' },
        other: { num: 2, a: 'hehe' },
        other2: { num: 3, a: 'huehue' },
      })
      item(SFilterValues((value, id) => value.num === 5 || id === 'other2'))
      expect(item()).toEqual({
        coolBro: { num: 5, a: 'haha' },
        other2: { num: 3, a: 'huehue' },
      })
    })
  })
  describe('SMapValues', () => {
    it('Should loop through each value of object and set it to the returned value', () => {
      const item = State<Record<string, string>>({
        coolBro: 'bro dude',
        other: 'woah dude'
      })
      item(SMapValues((v, i) => v + ':' + i))
      expect(item()).toEqual({
        coolBro: 'bro dude:coolBro',
        other: 'woah dude:other'
      })
    })
  })
  describe('SMapExtendValues', () => {
    it('Should loop through each value of object and set it to the returned value', () => {
      interface Test { num: number, a: string };
      const item = State<Record<string, Test>>({
        coolBro: { num: 5, a: 'haha' },
        other: { num: 2, a: 'hehe' }
      })
      item(SMapExtendValues((v, i) => ({ num: v.num + 5 })))
      expect(item()).toEqual({
        coolBro: { num: 10, a: 'haha' },
        other: { num: 7, a: 'hehe' }
      })
    })
  })
})