import { createCanvas } from './canvas.ts'
import { createComlinkWorker, transfer } from './modules/Workers/mod.ts';
import { attachListeners } from './modules/Keyboard/mod.ts';

const loadApp = async ({ useWorker = false }: { useWorker: boolean }) => {
  if (useWorker === false) return await import('./app-worker.ts');
  const appWorker = createComlinkWorker('/src/app-worker.js', { type: 'module' });
  return appWorker;
}

const run = async () => {
  const canvas = createCanvas()
  const offscreenCanvas = canvas.transferControlToOffscreen()
  const app = await loadApp({ useWorker: true })
  attachListeners(app)
  await app.run(transfer(offscreenCanvas, [offscreenCanvas]));
}

if (document.readyState === "complete") {
  run();
} else {
  window.addEventListener('DOMContentLoaded', run);
}
