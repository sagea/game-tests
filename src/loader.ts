import { createCanvas } from './canvas.ts'
import { createComlinkSharedWorker, createComlinkWorker, transfer } from './modules/Workers/mod.ts';
import { attachListeners } from './modules/Keyboard/mod.ts';

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
  console.log('hello!');
  // const clonedCanvasWorker = canvasWorker.clonePort();
  await app.attachCanvasWorker(transfer(canvasWorker.port, [canvasWorker.port]));
  attachListeners(app);
  await app.run();
}

if (document.readyState === "complete") {
  run();
} else {
  window.addEventListener('DOMContentLoaded', run);
}
