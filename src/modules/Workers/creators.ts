import { wrap } from './comlink-wrapper.ts';
import * as actionBind from './action-bind.ts';

export const createComlinkWorker = (path, options) => {
  const worker = new Worker(path, options);
  const actionWorker = actionBind.expose(worker);
  const comlinkWorker = wrap(actionWorker);
  return comlinkWorker;
}
export const createComlinkSharedWorker = (path, options) => {
  const worker = new SharedWorker(path, options);
  worker.port.start();
  const workerComlink = wrap(worker.port);
  const base = {
    get port() { return worker.port },
    clonePort() {
      const worker = new SharedWorker(path, options);
      worker.port.start();
      return worker.port;
    }
  }
  return new Proxy(base, {
    get(obj, key) {
      if (obj.hasOwnProperty(key)) {
        return Reflect.get(obj, key);
      }
      return Reflect.get(workerComlink, key);
    }
  })
}
