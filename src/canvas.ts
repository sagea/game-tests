import { prerender } from './animate'
import { clearRect } from './draw2'
import { curry } from 'ramda'
import { from, zero } from './Vector'

export const call = curry((key, args, actions) => [...actions, ['c', key, args]])
export const set = curry((key, value, actions) => [...actions, ['s', key, value]])

export const save = call('save')
export const fillRect = call('fillRect')
export const restore = call('restore')
export const fillStyle = set('fillStyle')

export const createCanvas = async () => {
    const canvas = document.createElement('canvas')
    Object.assign(canvas, { width: 1920, height: 1080 })
    Object.assign(canvas.style, { border: '1px solid #ccc', maxWidth: '100%' })
    document.body.appendChild(canvas)
    const canvasWorker = new Worker('/src/canvas-worker.js', { type: 'module' })
    const offscreen = canvas.transferControlToOffscreen()
    canvasWorker.postMessage({ type: 'canvas', canvas: offscreen}, [offscreen])
    return [
        canvasWorker,
        canvas
    ]
}

prerender.add((canvas) => {
    clearRect(...zero(), canvas.width, canvas.height);
    // return handleRenders(
    //     clearRect(zero(), from(canvas.width, canvas.height))
    // )(rs)
})
