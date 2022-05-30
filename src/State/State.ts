import { isArray, isFunction } from '../utilities/generic';
import produce, { Draft, enableAllPlugins } from 'immer';
enableAllPlugins()

export const State = <T>(initialState: T) => {
  let internalState: T = initialState;
  return (handler?: T | ((internalState: T) => T)) => {
    if (handler) {
      internalState = isFunction(handler) ? handler(internalState) : handler;
    }
    return internalState;
  }
}

export const StateImmer = <T>(initialState: T) => {
  let internalState: T = initialState;
  return (handler?: ((internalState: Draft<T>) => any)) => {
    if (handler) {
      internalState = produce<T>(internalState, draft => {
        handler(draft);
      });
    }
    return internalState;
  }
}

export const SValue = <T extends Record<string, any>, V extends T[keyof T]>(
  key: keyof T,
  handler: V | ((v: V) => V),
) => (internalState: T): T => {
  return {
    ...internalState,
    [key]: isFunction(handler) ? handler(internalState[key]) : handler,
  }
}



export const SExtendValue = <T extends Record<string, any>, V extends T[keyof T]>(
  key: keyof T,
  handler: Partial<V> | ((v: V) => Partial<V>)
) => SValue<T, V>(key, (item) => ({
  ...item,
  ...(
    isFunction(handler)
      ? handler(item)
      : handler
  )
}))

export const SExtend = <T extends Record<string, any>>(
  changes: Partial<T> | ((v: T) => Partial<T>)
) => (original: T): T => ({
  ...original,
  ...(isFunction(changes) ? changes(original) : changes),
})

export const SMapValues = <T extends Record<string, any>, V extends T[keyof T]>(
  handler: (v: V, prop: keyof T) => V,
) => (items: T): T => {
  const r = Object.entries(items)
    .map(([prop, value]) => [prop, handler(value, prop)]);
  return Object.fromEntries(r as any) as T;
}


export const SFilterValues = <T extends Record<string, any>, V extends T[keyof T]>(
  handler: (v: V, prop: keyof T) => boolean,
) => (items: T): T => {
  const r = Object.entries(items)
    .filter(([prop, value]) => handler(value, prop));
  return Object.fromEntries(r as any) as T;
}


export const SMapExtendValues = <T extends Record<string, any>, V extends T[keyof T]>(
  handler: (v: T[keyof T], prop: keyof T) => Partial<V>,
) => {
  return SMapValues<T, V>((item, prop) => ({
    ...item,
    ...handler(item, prop),
  }));
}
