import { prerender } from './animate.ts'
import { clearRect } from './draw.ts'
import { zero } from './Vector.ts'
import { State } from './State/State.ts'

export const Canvas = State({ width: 1920, height: 1080 });

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
