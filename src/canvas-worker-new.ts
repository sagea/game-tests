import { expose } from './modules/Workers/mod.ts';
import { loadImage } from './resources.ts';
import { Counter } from './utilities/counter.ts';

let canvas: any;
let ctx: any;
const methodRegistry = new Map<number, any>();
const resourceRegistry = new Map<string, any>();
const resourceRegistryCounter = Counter();
const drawQueue = new Set<[number, any[]]>()


export const setCanvas = (offscreenCanvas) => {
  canvas = offscreenCanvas;
  ctx = canvas.getContext('2d');
}

export const queueDraw = (methodId: number, args: any[]) => {
  drawQueue.add([methodId, args]);
}

export const draw = () => {
  for (const [methodId, args] of drawQueue) {
    methodRegistry.get(methodId)(ctx, ...args);
  }
}

export const registerDrawMethod = (method: string): number => {
  const id: number = resourceRegistryCounter();
  eval(`(() => {
    methodRegistry.set("${id}", ${method});
  })();`);
  return id;
}

export const loadResources = async (imageUrls: string[]) => {
  for await (let url of imageUrls) {
    console.log('Loading resource', url);
    const imageBitmap = await loadImage(url);
    resourceRegistry.set(url, imageBitmap);
    console.log('Resource loaded', url);
  }
}

const exposed = { setCanvas, registerDrawMethod, draw, queueDraw, loadResources };

self.onconnect = (event) => {
  console.log('connected')
  const port = event.ports[0]
  expose(exposed, port);
}

