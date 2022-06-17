import { clearRect } from './draw.ts'
import { zero } from './Vector.ts'
import { State } from './modules/State/mod.ts'
import { AppPlugin } from './modules/ecs/mod.ts'
import { startContext } from './draw.ts'
import { markStart, markEnd } from './debug.ts'

export const Canvas = State({ width: 1920, height: 1080 });

export const createCanvas = () => {
  const canvas = document.createElement('canvas')
  const { width, height } = Canvas();
  Object.assign(canvas, { width, height })
  Object.assign(canvas.style, { border: '1px solid #ccc', maxWidth: '100%' })
  document.body.appendChild(canvas)
  return canvas;
}

export const clearCanvas = () => {
  const { width, height } = Canvas();
  clearRect(...zero(), width, height);
};

export const canvasPlugin = (canvasWorker: any): AppPlugin => (app) => {
  let completeContext: any;
  app.addListener('prerender', () => {
    completeContext = startContext();
  })
  app.addRenderSystem(clearCanvas);
  app.addFinalSystem(async () => {
    markStart('draw')
    const results = completeContext()
    const perf = await canvasWorker.draw(Date.now(), performance.now(), results);
    for (let [name, detail, startTime] of perf) {
      // console.log('mark', mark)
      performance.mark(name, { detail, startTime });
    }
    markEnd('draw')
  })
}
