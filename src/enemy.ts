import { timeDiffS, timeMS } from './modules/loop/mod.ts'
import { beginPath, fill, fillStyle, rect, restore, save } from './draw.ts'
import { createHitBoxComponent, updateHitboxTransform, Hitbox } from './hitbox.ts'
import { random } from './utilities/generic.ts'
import { add, v, left, up } from './Vector.ts'
import { addEntity, Component, query } from './modules/ecs/mod.ts';
import { DeleteQueueManager } from './components/DeleteQueueManager.ts';
import { Position, Size } from './components/basic.ts';
import { AppPlugin, System } from './modules/ecs/mod.ts'

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

export const renderEnemiesSystem: System = () => {
  for (const { enemy, position, size } of query({ enemy: Enemy, position: Position, size: Size })) {
    const { health, originalHealth } = enemy();
    const healthPercentage = health / originalHealth;
    const hasTouchedBullet = false;
    save()
    beginPath()
    fillStyle('red')
    rect(...add(position(), up(50)), ...v(size().x, 20))
    fill();
    restore()

    save()
    beginPath()
    fillStyle('green')
    rect(...add(position(), up(50)), ...v(size().x * healthPercentage, 20))
    fill();
    restore()

    save()
    beginPath()
    fillStyle(hasTouchedBullet ? 'blue' : 'green')
    rect(...position(), ...size())
    fill();
    restore()
  }
}


export const EnemyPlugin: AppPlugin = (app) => {
  app
    .addInitSystem(spawnEntityManagerSystem)
    .addSystem(
      spawnEnemies,
      moveEnemies,
      enemyRemover,
    )
    .addRenderSystem(renderEnemiesSystem);
}
