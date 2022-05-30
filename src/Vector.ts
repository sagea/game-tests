import { set, lensProp, view, curry } from 'ramda'


const getX = ([x]) => x;
const setX = ([_x, _y], value) => [value, _y];
const getY = ([_, y]) => y;
const setY = ([_x], value) => [_x, value];

export const from = (x = 0, y = x) => {
    if (Array.isArray(x)) return from(x[0], x[1]);
    return [x, y];
}

export const zero = () => from(0)
export const x = (...args) => {
    if (args.length === 0) throw new Error('X requires a method')
    if (args.length === 1) return getX(...args);
    if (args.length === 2) return setX(...args)
}
export const y = (...args) => {
    if (args.length === 0) throw new Error('X requires a method')
    if (args.length === 1) return getY(...args)
    if (args.length === 2) return setY(...args);
}

export const add = curry((_1, _2) => {
    const [x1, y1] = from(_1);
    const [x2, y2] = from(_2);
    return [x1 + x2, y1 + y2];
})

export const up = (value) => from(0, value * -1)
export const down = (value) => from(0, value)
export const left = (value) => from(value * -1, 0)
export const right = (value) => from(value, 0)