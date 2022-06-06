import { transfer } from 'comlink';
import { createCanvas } from './canvas.ts'
import { createComlinkSharedWorker, createComlinkWorker } from './utilities/worker.ts';
import { resources } from './resources.ts';

const loadApp = async ({ useWorker = false }: { useWorker: boolean }) => {
  if (useWorker === false) return await import('./app-worker.ts');
  const appWorker = createComlinkWorker('/src/app-worker.js', { type: 'module' });
  return appWorker;
}

const run = async () => {
  const canvas = createCanvas();
  const offscreenCanvas = canvas.transferControlToOffscreen()
  const canvasWorker = createComlinkSharedWorker('/src/canvas-worker.js', { type: 'module' });
  canvasWorker.setCanvas(transfer(offscreenCanvas, [offscreenCanvas]));

  const app = await loadApp({ useWorker: true });
  const clonedCanvasWorker = canvasWorker.clonePort();

  await app.attachCanvasWorker(transfer(clonedCanvasWorker, [clonedCanvasWorker]));
  const resourceUrls = Array.from(Object.values(resources));
  await canvasWorker.loadResources(resourceUrls);
  setupListeners(app);
  await app.run();
}

const setupListeners = (app?: any) => {
  window.addEventListener('keydown', ({ code }) => app.fireEvent('windowKeyDownListener', { code }))
  window.addEventListener('keyup', ({ code }) => app.fireEvent('windowKeyUpListener', { code }))
  window.addEventListener('blur', () => app.fireEvent('windowBlurListener', {}))
}

if (document.readyState === "complete") {
  run();
} else {
  window.addEventListener('DOMContentLoaded', run);
}
