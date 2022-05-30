import { append, curry, forEach, mergeLeft, pipe } from 'ramda'
import { x, y } from './Vector'

const createHandler = (type, creator) => (...args) => ({ type, ...creator(...args) })
const createStyleMethod = (key) => curry((value, renderState) => mergeLeft(renderState, { [key]: value }))
export const fillStyle = createStyleMethod('fillStyle')
export const font = createStyleMethod('font')
export const lineWidth = createStyleMethod('lineWidth')
export const strokeStyle = createStyleMethod('strokeStyle')

export const attachStyles = (styles) => {
    if (styles.length === 0) return {}
    return pipe(...styles)({})
}


export const rect = createHandler('fillRect', (pos, size, ...styles) => ({ args: [...pos, ...size], styles: attachStyles(styles) }))
export const text = createHandler('fillText', (text, pos, ...styles) => ({ args: [text, ...pos], styles: attachStyles(styles) }))
export const path = createHandler('__path__', (paths, ...styles) => ({ paths, styles: attachStyles(styles) }))
export const clearRect = createHandler('clearRect', (pos, size) => ({ args: [...pos, ...size] }))

export const handleRenders = (...items) => {
    if (items.length === 0) {
        return gs => gs
    }
    return pipe(...items.map(item => append(item)))
}

const addStyleKey = curry((key, state) => mergeLeft(state, {
    [key]: (ctx, value) => Object.assign(ctx, { [key]: value })
}))

const styleHandlers = pipe(
    addStyleKey('strokeStyle'),
    addStyleKey('lineWidth'),
    addStyleKey('fillStyle'),
    addStyleKey('font'),
)({})

export const renderState = (ctx, state) => {

    state.forEach(({ type, args, paths, styles = {} }) => {
        ctx.save()
        Object.entries(styles)
            .forEach(([key, value]) => styleHandlers[key](ctx, value))
        if (type === '__path__') {
            const first = paths[0]
            ctx.beginPath()
            ctx.moveTo(x(first), y(first))
            forEach((path) => ctx.lineTo(x(path), y(path)), paths.slice(1))
            ctx.stroke()
            ctx.closePath()
        } else {
            ctx[type](...args)
        }
        ctx.restore()
    })
}
