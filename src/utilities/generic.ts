import * as r from 'ramda'

export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export const isFunction = (item: any): item is Function => typeof item === 'function'
export const isNumber = (item): item is number => typeof item === 'number'
export const isString = (item): item is string => typeof item === 'string'
export const isArray = (item): item is Array<any> => Array.isArray(item);
export const isObject = (item) => typeof item === 'object' && item !== null;
export const hasOwnProperty = (item, prop) => isObject(item) && prop in item;
export const hasSymbol = (item, symbol) => isObject(item) && hasOwnProperty(item, symbol);

export const isNotNil = r.complement(r.isNil)

export const random = (from, to = 0) => {
  const min = Math.min(from, to)
  const max = Math.max(from, to)
  return (Math.random() * (max - min)) + min
}

export const createEnum = <T extends string>(...args: T[]): Record<T, number> & Record<number, T> => {
  return Object.fromEntries(
    args.map((enumName, index) => [
      [enumName, index],
      [index, enumName],
    ]).flat()
  )
}

export const loadImage = (url: string) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = (e) => reject(e)
  img.src = url;
})
