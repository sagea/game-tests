import { zero } from './Vector.ts'
import { State } from './modules/State/mod.ts'

export const Canvas = State({ width: 1920, height: 1080 });

export const createCanvas = () => {
  const canvas = document.createElement('canvas')
  const { width, height } = Canvas();
  Object.assign(canvas, { width, height })
  Object.assign(canvas.style, { border: '1px solid #ccc', maxWidth: '100%' })
  document.body.appendChild(canvas)
  return canvas;
}
