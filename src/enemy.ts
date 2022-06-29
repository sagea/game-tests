import { timeDiffS, timeMS } from './modules/loop/mod.ts'
import { createHitBoxComponent, updateHitboxTransform, Hitbox } from './hitbox.ts'
import { random } from './utilities/generic.ts'
import { add, v, left, up } from './Vector.ts'
import { addEntity, Component, query } from './modules/ecs/mod.ts';
import { DeleteQueueManager } from './components/DeleteQueueManager.ts';
import { Position, Size } from './components/basic.ts';
import { AppPlugin, System } from './modules/ecs/mod.ts'
import { createMethod } from './modules/Sprite/mod.ts'

export const Enemy = Component<{
  speed: number;
  health: number;
  originalHealth: number;
}>();

export const EnemyManager = Component<{
  lastSpawnTime: number;
}>();


export const createEnemy = (posX: number) => {
  const startingPosition = v(1800, posX);
  const startingSize = v(100, 50);
  addEntity([
    Enemy({
      speed: 350,
      health: 100,
      originalHealth: 100,
    }),
    Position(startingPosition),
    Size(startingSize),
    DeleteQueueManager({ markedForDeletion: false }),
    createHitBoxComponent('Enemy', startingPosition, startingSize),
  ])
}

const moveEnemies = () => {
  for (const { enemy, position, size, hitbox } of query({ enemy: Enemy,position: Position, size: Size, hitbox: Hitbox })) {
    position(add(position(), left(enemy().speed * timeDiffS())))
    updateHitboxTransform(hitbox, position(), size());
  }
}

const enemyRemover = () => {
  for (const { position, deleteQueueManager } of query({ position: Position, deleteQueueManager: DeleteQueueManager })) {
    if (position().x < 100) {
      deleteQueueManager({ markedForDeletion: true });
    }
  }
}

export const spawnEnemies = () => {
  for(const { enemyManager } of query({ enemyManager: EnemyManager })) {
    const { lastSpawnTime } = enemyManager();
    if ((timeMS() - lastSpawnTime) < 1000) continue;
    enemyManager({ lastSpawnTime: timeMS() });
    createEnemy(random(100, 900));
  }
}

export const damageEnemy = (entityId: number, amount: number) => {
  for (const { enemy, deleteQueueManager } of query({enemy: Enemy, deleteQueueManager: DeleteQueueManager }, [entityId])) {
    enemy({ health: Math.max(0, enemy().health - amount) });
    if (enemy().health === 0) {
      deleteQueueManager({ markedForDeletion: true });
    }
  }
}

export const spawnEntityManagerSystem: System = () => {
  addEntity([
    EnemyManager ({
      lastSpawnTime: 0,
    }),
  ])
}

const drawEnemy = createMethod((ctx, size, position, healthPercentage, hasTouchedBullet) => {
  performance.mark('drawEnemy');
  const healthBarPosition = add(position, up(50));
  const healthbarSize = v(size.x, 20);
  ctx.save()
  ctx.beginPath()
  ctx.fillStyle = 'red'
  ctx.rect(healthBarPosition.x, healthBarPosition.y, healthbarSize.x, healthbarSize.y)
  ctx.fill();
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.fillStyle = 'green'
  ctx.rect(healthBarPosition.x, healthBarPosition.y, healthbarSize.x * healthPercentage, healthbarSize.y)
  ctx.fill();
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.fillStyle = hasTouchedBullet ? 'blue' : 'green';
  ctx.rect(position.x, position.y, size.x, size.y)
  ctx.fill();
  ctx.restore()
  performance.mark('drawEnemy');
})

export const renderEnemiesSystem: System = () => {
  for (const { enemy, position, size } of query({ enemy: Enemy, position: Position, size: Size })) {
    const { health, originalHealth } = enemy();
    const healthPercentage = health / originalHealth;
    const hasTouchedBullet = false;
    drawEnemy(size(), position(), healthPercentage, hasTouchedBullet)
  }
}


export const EnemyPlugin: AppPlugin<any> = (app) => {
  app
  .addSystem('init', { once: true }, spawnEntityManagerSystem)
    .addSystem(
      spawnEnemies,
      moveEnemies,
      enemyRemover,
    )
    .addSystem('render', renderEnemiesSystem);
}
