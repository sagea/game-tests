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

const newRenderer2 = (handlers) => {
  for (let handler of handlers) {
    executeOnCanvas(ctx, handler);
  }
}

const comlinkObj = { setCanvas, newRenderer2, loadResources };

self.onconnect = (event) => {
  console.log('connected')
  const port = event.ports[0]
  expose(comlinkObj, port);
}

