import { wrap, transfer } from '../../modules/Workers/mod.ts'
import { AppPlugin } from '../../modules/ecs/mod.ts'
import { addListener, getRegisteredMethod, removeListener, createMethod, Listener } from '../../modules/Sprite/mod.ts'

type PromisifyMethods<T> = {
  [id in keyof T]: T[id] extends (...args: infer U) => infer RT ? (...args: U) => Promise<RT>
    : T[id]
};

type WorkerNew = PromisifyMethods<typeof import('./worker.ts')>;
export const attachCanvasWorkerToPort = (port) => {
  const comlink = wrap(port) as WorkerNew;

  const registeredMethods = new Set<number>();
  const registering = new Map<number, Promise<any>>();

  let drawQueue: [number, any[]][] = [];

  const registerMethod = async (id: number, methodString: string) => {
    if (registeredMethods.has(id)) return;
    if (registering.has(id)) return;
    const promise = comlink.registerDrawMethod(id, methodString);
    registering.set(id, promise);
    await promise.then(() => {
      registering.delete(id);
      registeredMethods.add(id);
    });
  }

  const draw = (id: number, args: any[]) => {
    drawQueue.push([id, args]);
  }

  const drawAllQueued = async () => {
    if (registering.size) {
      await Promise.all(Array.from(registering));
    }
    comlink.drawMany(drawQueue);
    drawQueue = [];
  }
  return {
    setCanvas: (canvas: OffscreenCanvas) => {
      comlink.setCanvas(transfer(canvas, [canvas]));
    },
    draw,
    drawAllQueued,
    registerMethod,
    port: port,
    loadResources: comlink.loadResources,
  }
}

export const createCanvasWorker = (canvas: OffscreenCanvas) => {
  const worker = new SharedWorker('/src/canvas-worker-new.js', { type: 'module' });
  worker.port.start();
  const comlink = attachCanvasWorkerToPort(worker.port);
  comlink.setCanvas(transfer(canvas, [canvas]));
  return comlink;
}

const clearCanvas = createMethod((ctx) => {
  performance.mark('clearCanvas')
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  performance.mark('clearCanvas')
})

export const OffscreenCanvasPlugin = (worker: ReturnType<typeof createCanvasWorker>): AppPlugin<any> => (app) => {
  const renderMethodCaller: Listener = (id, args) => {
    worker.registerMethod(id, getRegisteredMethod(id));
    worker.draw(id, args);
  }
  app
    .addStageAfter('render', 'main')
    .stage('render').pre.addSystem(() => addListener(renderMethodCaller))
    .stage('render').post.addSystem(() => removeListener(renderMethodCaller))
    .stage('render').post.addSystem(() => worker.drawAllQueued())
    .stage('render').addSystem(() => clearCanvas());
}