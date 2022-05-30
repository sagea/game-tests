import { hasOwnProperty, hasSymbol, isFunction, isGenerator, isString, p, random, timeDifference } from '../util'
import { modify, mergeLeft, allPass, when, append, pipe, map, filter, values, curry, reduce, dissoc, forEach, assoc, mergeRight } from 'ramda'
import { add, down, from, left, right, up } from '../Vector';
import { GameState } from './GameState';

export const GO = <
  TObj extends { id: string },
  TKey
>(
  key: TKey extends string ? TKey : 'Key property must be a string'
) => {
  const wrapper = modify(key);

  const _getAll = (gs: GameState): Record<string, TObj> => gs[key as any];

  const _getValues = (gs: GameState): TObj[] => values(_getAll(gs));

  const _get = curry((
    objOrId: TObj | string,
    gs: GameState
  ): TObj => {
    if (isString(objOrId)) {
      return _getAll(gs)[objOrId];
    }
    return objOrId;
  });

  const _set = curry((
    obj: TObj,
    gs: GameState
  ): GameState => wrapper(assoc(obj.id, obj), gs)) as any;

  const _clear = curry((
    gs: GameState
  ): GameState => assoc(key, {}, gs) as any);

  const _remove = curry((
    obj: TObj | string,
    gs: GameState
  ): GameState => {
    const toRemoveId = _get(obj, gs)?.id;
    if (!toRemoveId) return gs
    const { [toRemoveId]: _, ...rest } = gs[key];
    return {
      ...gs,
      [key]: rest,
    }
  });

  const _modifyObject = curry((id, callback, gs) => modify(key, modify(id, callback), gs))

  const _map = curry((callback, gs) => map(callback, _getValues(gs)));

  const _flatMap = curry((callback, gs) => _reduce((res, item) => 
    [...res, ...[callback(item)].flat()], [], gs))

  const _filter = curry((callback, gs) => filter(callback, _getValues(gs)));
  const _filterGS = curry((
    callback: (item: TObj) => boolean,
    gs: GameState
  ) => _reduceGS((gs: GameState, item: TObj): GameState => {
    return callback(item)
      ? _set(item, gs)
      : _remove(item, gs);
  }, gs));
  const _forEach = curry((callback, gs) => forEach(callback, _getValues(gs)))
  const _reduce = curry(<TValue>(
    callback: (gs: TValue, item: TObj) => TValue,
    initialValue: TValue,
    gs: GameState
  ): TValue => reduce(callback, initialValue, _getValues(gs)))
  const _reduceGS = curry((
    callback: (gs: GameState, obj: TObj) => GameState,
    gs: GameState
    ): GameState => {
      return reduce((gs, item) => callback(gs, item), gs, _getValues(gs))
    })

  const _mapGS = curry((callback, gs) => _reduceGS((gs, item) => _set(callback(item), gs), gs));
  const attachToGlobalState = gs => {
    if (hasOwnProperty(gs, key)) throw new Error(`Key already exists ${key}`);
    return { ...gs, [key]: {} }
  }
  return {
      getAll: _getAll,
      get: _get,
      set: _set,
      clear: _clear,
      remove: _remove,
      map: _map,
      flatMap: _flatMap,
      filter: _filter,
      filterGS: _filterGS,
      forEach: _forEach,
      reduce: _reduce,
      mapGS: _mapGS,
      reduceGS: _reduceGS,
      modifyObject: _modifyObject,
      attachToGlobalState,
  }
}

export const Field = <TFieldType>(key: string, initialValue: TFieldType) => {
  const _get = gs => gs[key];
  const _set = curry((valueHandler, gs) => {
    const nextValue = isFunction(valueHandler)
      ? valueHandler(_get(gs), gs)
      : valueHandler;
    return assoc(key, nextValue, gs)
  });
  const attachToGlobalState = gs => {
    if (hasOwnProperty(gs, key)) throw new Error(`Key already exists ${key}`);
    return { ...gs, [key]: initialValue }
  }
  return {
    set: _set,
    get: _get,
    attachToGlobalState,
  }
}

export const FieldVector = (key, initialValue) => {
  const item = Field(key, from(initialValue));
  
  const _add = curry((vector, gs) => {
    const orig = item.get(gs);
    return item.set(add(orig, vector), gs)
  });
  const _set = curry((vector, gs) => item.set(from(vector), gs))
  const _up = curry((number, gs) => _add(up(number), gs))
  const _down = curry((number, gs) => _add(down(number), gs))
  const _left = curry((number, gs) => _add(left(number), gs))
  const _right = curry((number, gs) => _add(right(number), gs))
  return {
    add: _add,
    up: _up,
    down: _down,
    left: _left,
    right: _right,
    set: _set,
    get: item.get,
    attachToGlobalState: item.attachToGlobalState,
  }
}