export type Immutable<T> = {
  readonly [K in keyof T]: Immutable<T[K]>;
};

export const immutable = <T>(t: T): Immutable<T> => {
  const obj = Object.freeze(t);
  if (Array.isArray(obj)) {
    obj.forEach(item => immutable(item));
  } else if (typeof obj === 'object' && obj !== null) {
    for (let value of Object.values(obj)) {
      immutable(value);
    }
  }
  return obj;
}