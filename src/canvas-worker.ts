import { expose } from 'comlink';
import { executeOnCanvas } from './draw'

let canvas;
let ctx;

const setCanvas = (offscreenCanvas) => {
  canvas = offscreenCanvas;
  ctx = canvas.getContext('2d');
}

const newRenderer2 = (handlers) => {
  for (let handler of handlers) {
    executeOnCanvas(ctx, handler);
  }
}
const comlinkObj = { setCanvas, newRenderer2 };

self.onconnect = (event) => {
  console.log('connected')
  const port = event.ports[0]
  expose(comlinkObj, port);
}

