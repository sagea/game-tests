import { Counter } from '../../utilities/counter.ts';
const isEvent = <T>(data: T) => {
  if (!data) return false;
  if (typeof data !== 'object') return false;
  if ('$$event_type$$' in data) return data;
  return false;
}
export const expose = (worker: Worker) => {
  worker.addEventListener('message', ({ data }) => {
    if (!isEvent(data)) return;
    if (data.$$event_type$$ === 'createWorker') {
      const sharedWorker = new SharedWorker(...data.args);
      sharedWorker.port.start();
      worker.postMessage({
        $$event_type$$: 'createWorker',
        $$event_state$$: 'in',
        id: data.id,
        result: sharedWorker.port,
      }, [sharedWorker.port]);
    }
  })
  return worker;
}

export const wrap = (self: WorkerGlobalScope) => {
  const idCounter = Counter();
  
  const createWorker = (...args: ConstructorParameters<typeof Worker>) => {
    return new Promise(resolve => {
      const id = idCounter();
      const handler = ({ data }) => {
        if (!isEvent(data)) return;
        if (data.id !== id) return;
        self.removeEventListener('message', handler);
        resolve(data.result);
      }
      self.addEventListener('message', handler)

      self.postMessage({
        $$event_type$$: 'createWorker',
        $$event_state$$: 'out',
        id,
        args: args,
      });
    })
  }
  const addEventListener = (target, ) => {}
  return { createWorker };
}

