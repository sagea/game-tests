import * as r from 'ramda'
import { isGlobalState } from './State/GlobalState';

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
export const timeDifference = r.curry((timeSince, lastTime) => {
    return (Date.now() - lastTime) >= timeSince
})

export const updateIfReducer = (handler, updateFn) => (state, value) => {
    if (handler(value)) return updateFn(state, value)
    return state
}

export const betweenEquals = (num, start, end) => num >= start && num <= end

export const random = (from, to=0) => {
    const min = Math.min(from, to)
    const max = Math.max(from, to)
    return (Math.random() * (max - min)) + min
}

export const flattenEnsurePipe = (...deepArgs) => {
    const flatArgs = r.flatten(deepArgs)
        .filter(isFunction);
    if (flatArgs.length === 0) return [passthrough]
    return flatArgs;
}
export const passthrough = _ => _;
export const createEnum = <T extends string>(...args: T[]): Record<T, number> & Record<number, T> => {
    return Object.fromEntries(
        args.map((enumName, index) => [
            [enumName, index],
            [index, enumName],
        ]).flat()
    )
}

export const isGenerator = (item: unknown): boolean => {
    function* f() {}
    return Boolean(item && item?.__proto__?.constructor?.name == f().__proto__.constructor.name)
}
export const p = (...args) => (gs) => {
    return args.reduce((gs, action) => {
        if (isGlobalState(action)) return action;
        if (Array.isArray(action)) return p(...action)(gs);
        if (isFunction(action)) {
            const exec = action(gs);
            if (isGenerator(exec)) return p(...exec)(gs)
            return p(exec);
        }
        throw new Error('Unknown value in p');
    }, gs)
}

// R.mapObjIndexed
// export function mapObjIndexed;
export const mapValues = <T, TResult, TKey extends string>(
    callback: (value: T) => TResult,
    obj: Record<TKey, T>,
): Record<TKey, TResult> => {
    const r = Object.entries<T>(obj)
        .map(([id, value]) => [id, callback(value)])
    return Object.fromEntries<T>(r as any) as any;
}


export const filterValues = <T, TResult, TKey extends string>(
    callback: (value: T) => boolean,
    obj: Record<TKey, T>,
): Record<TKey, TResult> => {
    const r = Object.entries<T>(obj)
        .filter(([, value]) => callback(value));
    return Object.fromEntries<T>(r as any) as any;
}


export const values = <V>(obj: Record<string, V>): V[] => Object.values(obj);

const km = new Map();
export const killIf = (key) => {
    if (!km.has(key)) {
        window.addEventListener('keydown', ({ code }) => {
            if (code === key) {
                km.set(key, true)
            }
        })
        km.set(key, false)
    }
    if (km.get(key)) {
        throw new Error('Killing now');
    }
}

export const loadImage = (url: string) => new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = url;
})
