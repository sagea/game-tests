import { expose } from './modules/Workers/mod.ts';
import { executeOnCanvas } from './draw.ts'
import { loadImage, addResource } from './resources.ts';

let canvas;
let ctx;

const loadResources = async (imageUrls: string[]) => {
  for await (let url of imageUrls) {
    console.log('Loading resource', url);
    const imageBitmap = await loadImage(url);
    addResource(url, imageBitmap)
    console.log('Resource loaded', url);
  }
}

const setCanvas = (offscreenCanvas) => {
  canvas = offscreenCanvas;
  ctx = canvas.getContext('2d');
}

const draw = (time, now, handlers) => {
  const offset = Date.now() - time;
  const canvperf = performance.now();
  for (let handler of handlers) {
    executeOnCanvas(ctx, handler);
  }
  const entries = performance.getEntries()
  const perf = [...entries].map(e => [
    e.name,
    e.detail,
    (e.startTime - canvperf) + offset + now,
  ]);
  // console.log([...entries][3])
  performance.clearMarks();
  performance.clearMeasures();
  return perf;
}

const comlinkObj = { setCanvas, draw, loadResources };
self.onconnect = (event) => {
  console.log('connected')
  const port = event.ports[0]
  expose(comlinkObj, port);
}

