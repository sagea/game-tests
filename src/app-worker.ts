import { expose, wrap } from 'comlink';
import * as events from './utilities/events';

let canvasWorker;
export const attachCanvasWorker = (transferredCanvasWorker) => {
  console.log('received canvas worker');
  canvasWorker = wrap(transferredCanvasWorker);
  return true;
}
export const fireEvent = (key, data) => {
  events[key].push(data);
}
export const run = async () => {
  if (!canvasWorker) throw new Error('canvasWorker has not been setup yet');
  await import('./canvas');
  await import('./keys');
  await import('./user');
  await import('./enemy');
  await import('./bullets');
  await import('./debug');
  const { activate } = await import('./animate');
  activate(canvasWorker);
}
const methods = {
  attachCanvasWorker,
  fireEvent,
  run,
}

expose(methods);
export default methods;
