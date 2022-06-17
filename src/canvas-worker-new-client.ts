import { wrap } from './modules/Workers/mod.ts';

type PromisifyMethods<T> = {
  [id in keyof T]: T[id] extends (...args: infer U) => infer RT ? (...args: U) => Promise<RT>
    : T[id]
};

type WorkerNew = PromisifyMethods<typeof import('./canvas-worker-new.ts')>;

export const createWorker = () => {
  const worker = new SharedWorker('/src/canvas-worker-new.ts', { type: 'module' });
  worker.port.start();
  const comlink = wrap(worker.port) as WorkerNew;
  return Object.assign(comlink, { port: worker.port });
}

export const createMethod = async (worker: WorkerNew, method: any) => {
  const methodId: number = await worker.registerDrawMethod(method.toString());
  return async <T extends any[]>(...args: T) => {
    return await worker.queueDraw(methodId, args);
  }
}

export const draw = async (worker: WorkerNew) => {
  return await worker.draw();
}