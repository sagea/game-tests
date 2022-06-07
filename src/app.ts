import { App } from './modules/ecs/mod.ts';

import './components/DeleteQueueManager.ts';
import './components/basic.ts';
import './hitbox.ts';
import './canvas.ts';
import './keys.ts';
import './user.ts';
import './enemy.ts';
import './bullets.ts';
import './debug.ts';
App()
  .addSystem()