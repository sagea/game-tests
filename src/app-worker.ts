import { expose, wrap } from './modules/Workers/mod.ts';
import { attachListeners } from './modules/Keyboard/mod.ts'
import { startApp } from './app.ts';

let canvasWorker;
export const attachCanvasWorker = (transferredCanvasWorker) => {
  console.log('received canvas worker');
  canvasWorker = wrap(transferredCanvasWorker);
  return true;
}

export const run = async () => {
  console.log('run')
  if (!canvasWorker) {
    throw new Error('canvasWorker has not been setup yet')
  };
  await startApp(canvasWorker);
}

const methods = {
  attachCanvasWorker,
  run,
}

expose({ ...methods, ...attachListeners() });

export default methods;
