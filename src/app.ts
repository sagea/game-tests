import { App } from './modules/ecs/mod.ts';
import { applySnapshot } from './modules/Keyboard/mod.ts'
import { deleteQueuePlugin } from './components/DeleteQueueManager.ts';
import { hitboxPlugin } from './hitbox.ts';
import { canvasPlugin } from './canvas.ts';
import { userPlugin } from './user.ts';
import { EnemyPlugin } from './enemy.ts';
import { bulletPlugin } from './bullets.ts';
import { debugPlugin } from './debug.ts';
import { LoopPlugin } from './modules/loop/mod.ts';
import { resources } from './resources.ts';


export const startApp = async (canvasWorker: any) => {
  const resourceUrls = Array.from(Object.values(resources));
  await canvasWorker.loadResources(resourceUrls);

  return new App()
    .addPlugin(LoopPlugin)
    .addPlugin(canvasPlugin(canvasWorker))
    .addPlugin(app => app.addSystem(applySnapshot))
    .addPlugin(deleteQueuePlugin)
    .addPlugin(hitboxPlugin)
    .addPlugin(EnemyPlugin)
    .addPlugin(bulletPlugin)
    .addPlugin(userPlugin)
    .addPlugin(debugPlugin)
    .run();
}
