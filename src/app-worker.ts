import { expose, wrap } from './modules/Workers/mod.ts';
import * as events from './utilities/events.ts';
import { attachListeners } from './modules/Keyboard/mod.ts'
import './components/DeleteQueueManager.ts';
import './components/basic.ts';
import './hitbox.ts';
import './canvas.ts';
import './keys.ts';
import './user.ts';
import './enemy.ts';
import './bullets.ts';
import './debug.ts';
import { activate } from './animate.ts';

let canvasWorker;
export const attachCanvasWorker = (transferredCanvasWorker) => {
  console.log('received canvas worker');
  canvasWorker = wrap(transferredCanvasWorker);
  return true;
}

export const fireEvent = (key, data) => {
  console.log('fireEvent')
  events[key].push(data);
}

export const run = async () => {
  console.log('run')
  if (!canvasWorker) {
    throw new Error('canvasWorker has not been setup yet')
  };
  await activate(canvasWorker);
}

const methods = {
  attachCanvasWorker,
  fireEvent,
  run,
}


expose({ ...methods, ...attachListeners() });
export default methods;
