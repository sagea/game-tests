import { prerender } from './animate'
import { clearRect } from './draw'
import { curry } from 'ramda'
import { zero } from './Vector'
import { State } from './State/State'

export const Canvas = State({ width: 1920, height: 1080 });

export const call = curry((key, args, actions) => [...actions, ['c', key, args]])
export const set = curry((key, value, actions) => [...actions, ['s', key, value]])

export const save = call('save')
export const fillRect = call('fillRect')
export const restore = call('restore')
export const fillStyle = set('fillStyle')

export const createCanvas = () => {
  const canvas = document.createElement('canvas')
  const { width, height } = Canvas();
  Object.assign(canvas, { width, height })
  Object.assign(canvas.style, { border: '1px solid #ccc', maxWidth: '100%' })
  document.body.appendChild(canvas)
  return canvas;
}

prerender.add(() => {
  const { width, height } = Canvas();
  clearRect(...zero(), width, height);
})
