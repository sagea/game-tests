import { curry } from 'ramda'

function* it() {
  yield this.x;
  yield this.y;
}
export interface Vector {
  x: number;
  y: number;
  0: number;
  1: number;
  [Symbol.iterator]: any;
}

export const v = (x: number, y: number): Vector => {
  return {
    x,
    y,
    [0]: x,
    [1]: x,
    [Symbol.iterator]: it,
  }
}

export const zero = () => v(0, 0);

export const add = curry((a: Vector, b: Vector) => {
  return v(a.x + b.x, a.y + b.y);
})

export const up = (value: number) => v(0, value * -1)
export const down = (value: number) => v(0, value)
export const left = (value: number) => v(value * -1, 0)
export const right = (value: number) => v(value, 0)