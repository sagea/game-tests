import { expose, wrap } from './modules/Workers/mod.ts';
import { attachListeners } from './modules/Keyboard/mod.ts'
import { startApp } from './app.ts';
import * as actionBind from './modules/Workers/action-bind.ts';
import { attachCanvasWorkerToPort } from './modules/OffthreadCanvas/client.ts';
const { createWorker } = actionBind.wrap(self);

export const run = async (canvas: OffscreenCanvas) => {
  console.log('run');
  const worker = await createWorker('/src/offthread-worker.js', { type: 'module' });
  const canvasWorker = attachCanvasWorkerToPort(worker);
  canvasWorker.setCanvas(canvas);
  await startApp(canvasWorker);
}

const methods = {
  run,
}

expose({ ...methods, ...attachListeners() });

export default methods;
