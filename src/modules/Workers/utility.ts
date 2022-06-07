export const isWorkerContext = () => {
  if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    return true;
  } else {
    return false;
  }
}
