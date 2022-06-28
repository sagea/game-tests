import { expose } from '../../modules/Workers/mod.ts';
import { loadImage } from '../../resources.ts';
import VectorDefault, * as __vector__ from '../../Vector.ts'

let canvas: any;
let ctx: any;
const methodRegistry = new Map<number, any>();
const resourceRegistry = new Map<string, any>();


export const setCanvas = (offscreenCanvas) => {
  canvas = offscreenCanvas;
  ctx = canvas.getContext('2d');
}

export const draw = (id: number, args: any[]) => {
  const method = methodRegistry.get(id);
  if (method) {
    method(ctx, ...args);
  }
}

export const drawMany = (methods: [number, any[]][]) => {
  for (const [id, args] of methods) {
    draw(id, args);
  }
}

export const registerDrawMethod = (id: number, method: string): number => {
  console.log('registerDrawMethod')
  const keys = Object.keys(__vector__);
  eval(`self.temp = ({${keys.join(',')}}, getResource) => {
    methodRegistry.set(${id}, ${method});
  };`);
  (self as any).temp(__vector__, (id) => resourceRegistry.get(id));
  delete (self as any).temp;
  
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

const exposed = { setCanvas, registerDrawMethod, draw, drawMany, loadResources };

self.onconnect = (event) => {
  console.log('connected')
  const port = event.ports[0]
  // port.addEventListener('message', (event) => {
  //   const data = event.data;
  //   if (!data) return;
  //   if (typeof data !== 'object') return;
  //   if (!('__type__' in data)) return;
  // })
  expose(exposed, port);
}

