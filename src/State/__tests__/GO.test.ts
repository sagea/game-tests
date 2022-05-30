import { Field, FieldVector, GO } from '../GO';
import { from } from '../../Vector';

describe('GO.test.js', () => {
  describe('GO', () => {
    it('getAll should get all', () => {
      const item = GO('item');
      expect(item.getAll({ item: {} })).toEqual({});
      expect(item.getAll({ item: { foo: { id: 'foo' }} })).toEqual({ foo: { id: 'foo' }});
    })
    it('get should return object when provided id', () => {
      const item = GO('item')
      const obj = { id: 'foo', other: '' }
      const gs = {
        item: { foo: obj }
      }
      expect(item.get('foo', gs)).toEqual(obj);
    })
    it('get should return object when given object with id', () => {
      const item = GO('item')
      const obj = { id: 'foo', other: '' }
      const gs = {
        item: { foo: obj }
      } 
      expect(item.get(obj, gs)).toEqual(obj);
    })
    it('clear should remove all objects', () => {
      const item = GO('item');
      const obj1 = { id: 'foo', other: '' }
      const obj2 = { id: 'bar', other: '' }
      const obj3 = { id: 'baz', other: '' }
      const gs = {
        item: { foo: obj1, bar: obj2, baz: obj3 }
      }
      expect(item.clear(gs)).toEqual({ item: {} })
  
    })
    it('attachToGlobalState should attach to global state', () => {
      const item = GO('item');
      expect(item.attachToGlobalState({})).toEqual({ item: {} })
    })
    it('set should add object', () => {
      const item = GO('item');
      const gs = item.attachToGlobalState({})
      const obj = {id: 'foo', a: 'awesome' }
      expect(item.set(obj, gs)).toEqual({
        item: { foo: obj }
      })
    })
    it('remove should remove object if id is provided', () => {
      const item = GO('item')
      const obj = { id: 'foo', other: '' }
      const gs = {
        item: { foo: obj }
      }
      expect(item.remove('foo', gs)).toEqual({ item: {} });
    })
    it('remove should remove object if object is provided', () => {
      const item = GO('item')
      const obj = { id: 'foo', other: '' }
      const gs = {
        item: { foo: obj }
      }
      expect(item.remove(obj, gs)).toEqual({ item: {} });
    })
    it('modifyObject should allow us to modify an existing object and return globalState', () => {
      const item = GO('item');
      const obj1 = { id: 'foo', other: '' };
      const obj2 = { id: 'bar', other: '' };
      const gs = [
        item.attachToGlobalState,
        item.set(obj1),
        item.set(obj2),
      ].reduce((gs, fn) => fn(gs), {});
      expect(item.modifyObject(obj1.id, item => ({ ...item, woah: 'boom' }), gs))
        .toEqual({
          item: {
            foo: { id: 'foo', other: '', woah: 'boom' },
            bar: obj2
          }
        })
    })
    it('flatMap should flatten array of mapped item if exists', () => {
      const item = GO('item');
      const obj1 = { id: 'foo', other: '' };
      const obj2 = { id: 'bar', other: '' };
      const obj3 = { id: 'baz', other: '' };
      const gs = [
        item.attachToGlobalState,
        item.set(obj1),
        item.set(obj2),
        item.set(obj3),
      ].reduce((gs, fn) => fn(gs), {});
      const handler = (item) => item.id === 'bar' ? item.id : [item.id, 'proof']
      expect(item.flatMap(handler, gs)).toEqual([ 'foo', 'proof', 'bar', 'baz', 'proof' ])
    })
    it('filter should return a filterd list', () => {
      const item = GO('item');
      const obj1 = { id: 'foo', other: '' };
      const obj2 = { id: 'bar', other: '' };
      const obj3 = { id: 'baz', other: '' };
      const gs = [
        item.attachToGlobalState,
        item.set(obj1),
        item.set(obj2),
        item.set(obj3),
      ].reduce((gs, fn) => fn(gs), {});
      expect(item.filter(() => false, gs)).toEqual([]);
      expect(item.filter(() => true, gs)).toEqual([obj1, obj2, obj3]);
      expect(item.filter((item) => item.id === 'bar', gs)).toEqual([obj2]);
    })

    it('filterGS should return the game state with the field filtered', () => {
      const item = GO('item');
      const obj1 = { id: 'foo', other: '' };
      const obj2 = { id: 'bar', other: '' };
      const obj3 = { id: 'baz', other: '' };
      const gs = [
        item.attachToGlobalState,
        item.set(obj1),
        item.set(obj2),
        item.set(obj3),
      ].reduce((gs, fn) => fn(gs), {});
      expect(item.filterGS(() => false, gs)).toEqual({ item: {} });
      expect(item.filterGS(() => true, gs)).toEqual({ item: { foo: obj1, bar: obj2, baz: obj3 }});
      expect(item.filterGS((item) => item.id === 'bar', gs)).toEqual({ item: { bar: obj2 } });
    })
    it('map should return array of maped items', () => {
      const item = GO('item');
      const obj1 = { id: 'foo', other: '' };
      const obj2 = { id: 'bar', other: '' };
      const obj3 = { id: 'baz', other: '' };
      const gs = [
        item.attachToGlobalState,
        item.set(obj1),
        item.set(obj2),
        item.set(obj3),
      ].reduce((gs, fn) => fn(gs), {});
      expect(item.map(() => 1, gs)).toEqual([1, 1, 1]);
      expect(item.map(item => item.id, gs)).toEqual(['foo', 'bar', 'baz']);
    })
    
    it('mapGS should return global state with modified map items', () => {
      const item = GO('item');
      const obj1 = { id: 'foo', other: '' };
      const obj2 = { id: 'bar', other: '' };
      const obj3 = { id: 'baz', other: '' };
      const gs = [
        item.attachToGlobalState,
        item.set(obj1),
        item.set(obj2),
        item.set(obj3),
      ].reduce((gs, fn) => fn(gs), {});
      const result = item.mapGS(item => ({ ...item, blarg: 'haha' }), gs);
      expect(result).toEqual({
        item: {
          foo: { id: 'foo', other: '', blarg: 'haha' },
          bar: { id: 'bar', other: '', blarg: 'haha' },
          baz: { id: 'baz', other: '', blarg: 'haha' },
        }
      });
    })
    it('reduce should run reduce against objects and return the last callback result', () => {
      const item = GO('item');
      const obj1 = { id: 'foo', other: '' };
      const obj2 = { id: 'bar', other: '' };
      const obj3 = { id: 'baz', other: '' };
      const gs = [
        item.attachToGlobalState,
        item.set(obj1),
        item.set(obj2),
        item.set(obj3),
      ].reduce((gs, fn) => fn(gs), {});
      const result = item.reduce((last, item) => `${last}:${item.id}`, 'start', gs);
      expect(result).toEqual('start:foo:bar:baz');
    })
    describe('reduceGS', () => {
      let item;
      let gs;
      beforeEach(() => {
        item = GO('item');
        const obj1 = { id: 'foo', other: '' };
        const obj2 = { id: 'bar', other: '' };
        const obj3 = { id: 'baz', other: '' };
        gs = [
          item.attachToGlobalState,
          item.set(obj1),
          item.set(obj2),
          item.set(obj3),
        ].reduce((gs, fn) => fn(gs), {});
      })
      it('reduceGS should behave the same as reduce but pass in the global state', () => {
        const result = item.reduceGS((gs, item) => ({ ...gs, [item.id]: item.id }), gs);
        expect(result).toEqual({
          item: {
            foo: { id: 'foo', other: ''},
            bar: { id: 'bar', other: ''},
            baz: { id: 'baz', other: ''},
          },
          'foo': 'foo',
          'bar': 'bar',
          'baz': 'baz',
        });
      })
      it('reduceGS should handle call returned callbacks', () => {
        const result = item.reduceGS((gs, item) => {
          return [
            (gs) => ({ ...gs, a: true })
          ]
        }, gs)
        expect(result).toEqual({ a: true });
      })

      it('reduceGS should handle generator callback', () => {
        const result = item.reduceGS(function* (gs, item) {
          yield gs
          yield (gs) => ({ ...gs, a: true })
          yield (gs) => ({ ...gs, b: true })
        }, gs)
        expect(result).toEqual({ a: true, b: true  });
      })
    })
    
  });
  
  describe('Field', () => {
    it('attachToGlobalState  should attach to global state with default', () => {
      let itemA = Field('itemA', 0);
      let itemB = Field('itemB', 'woah');
      expect(itemA.attachToGlobalState({})).toEqual({ itemA: 0 })
      expect(itemB.attachToGlobalState({})).toEqual({ itemB: 'woah' })
    });
    it('get should return field value', () => {
      let item = Field('item', 0);
      let gs = {
        item: 10,
        foo: { bar: '' }
      }
      expect(item.get(gs)).toEqual(10);
    })
    it('set should set the field value', () => {
      let item = Field('item', 0);
      let gs = item.attachToGlobalState({});
      expect(gs).toEqual({ item: 0 })
      expect(item.set(500, gs)).toEqual({ item: 500})
    })
  })
  describe('FieldVector', () => {
    it('attachToGlobalState should attach vector', () => {
      let itemA = FieldVector('itemA', 0);
      let itemB = FieldVector('itemB', from(1, 2));
      expect(itemA.attachToGlobalState({})).toEqual({ itemA: [0, 0] });
      expect(itemB.attachToGlobalState({})).toEqual({ itemB: [1, 2] });
    });
    it('set should set a vector', () => {
      let item = FieldVector('item', 0);
      expect(item.set(10, {})).toEqual({ item: [10, 10] });
      expect(item.set(from(10, 12), {})).toEqual({ item: [10, 12]});
    })
    it('get should get a vector', () => {
      let item = FieldVector('item', 10);
      expect(item.get({ item: [5, 5]})).toEqual([5, 5])
    });
    it('add should add a vector', () => {
      let item = FieldVector('item', 10);
      const gs = item.attachToGlobalState({});
      expect(item.add(5, gs)).toEqual({ item: [15, 15]});
      expect(item.add(from(5, 10), gs)).toEqual({ item: [15, 20]})
    })
  })
})