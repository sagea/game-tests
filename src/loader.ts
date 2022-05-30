




import { transfer } from 'comlink';
import { createCanvas } from './canvas'
import { createComlinkSharedWorker, createComlinkWorker } from './utilities/worker';

const loadApp = async ({ useWorker = false }: { useWorker: boolean }) => {
  if (useWorker === false) return await import('./app-worker');
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

    setupListeners(app);
    await app.run();
}

const setupListeners = (app?: any) => {
  window.addEventListener('keydown', ({ code }) => app.fireEvent('windowKeyDownListener', { code }))
  window.addEventListener('keyup', ({ code }) => app.fireEvent('windowKeyUpListener', { code }))
}

if (document.readyState === "complete") {
    run();
} else {
    window.addEventListener('DOMContentLoaded', run);
}
