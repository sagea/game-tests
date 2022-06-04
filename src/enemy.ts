import { timeDiffS, update, timeMS, render, $$initiate } from './animate.ts'
import { beginPath, fill, fillStyle, rect, restore, save } from './draw.ts'
import { createHitBoxComponent, updateHitboxTransform } from './hitbox.ts'
import { random } from './utilities/generic.ts'
import { add, v, left, up } from './Vector.ts'
import { addEntity, Component, createComponent, query } from './modules/ecs/index.ts';
declare module './modules/ecs' {
  export interface ComponentList {
    Enemy: Component<'Enemy', {
      speed: number;
      health: number;
      originalHealth: number;
    }>;
    EnemyManager: Component<'EnemyManager', {
      lastSpawnTime: number;
    }>
  }
}

$$initiate.once(() => {
  addEntity([
    createComponent('EnemyManager', {
      lastSpawnTime: 0,
    }),
  ])
});

export const createEnemy = (posX: number) => {
  const startingPosition = v(1800, posX);
  const startingSize = v(100, 50);
  addEntity([
    createComponent('Enemy', {
      speed: 350,
      health: 100,
      originalHealth: 100,
    }),
    createComponent('Position', startingPosition),
    createComponent('Size', startingSize),
    createComponent('DeleteQueueManager', { markedForDeletion: false }),
    createHitBoxComponent('Enemy', startingPosition, startingSize),
  ])
}

const moveEnemies = () => {
  for (const { Enemy, Position, Size, Hitbox } of query(['Enemy', 'Position', 'Size', 'Hitbox'])) {
    Position(add(Position(), left(Enemy().speed * timeDiffS())))
    updateHitboxTransform(Hitbox, Position(), Size());
  }
}

const enemyRemover = () => {
  for (const { Position, DeleteQueueManager } of query(['Position', 'DeleteQueueManager'])) {
    if (Position().x < 100) {
      DeleteQueueManager({ markedForDeletion: true });
    }
  }
}

export const spawnEnemies = () => {
  for(let { EnemyManager } of query(['EnemyManager'])) {
    const { lastSpawnTime } = EnemyManager();
    if ((timeMS() - lastSpawnTime) < 1000) continue;
    EnemyManager({ lastSpawnTime: timeMS() });
    createEnemy(random(100, 900));
  }
}

export const damageEnemy = (entityId: number, amount: number) => {
  for (let { Enemy, DeleteQueueManager } of query(['Enemy', 'DeleteQueueManager'], [entityId])) {
    Enemy({ health: Math.max(0, Enemy().health - amount) });
    if (Enemy().health === 0) {
      DeleteQueueManager({ markedForDeletion: true });
    }
  }
}

update.add(
  spawnEnemies,
  moveEnemies,
  enemyRemover,
);
render.add(() => {
  for (const { Enemy, Position, Size } of query(['Enemy', 'Position', 'Size'])) {
    const { health, originalHealth } = Enemy();
    const healthPercentage = health / originalHealth;
    const hasTouchedBullet = false;
    const pos = Position();
    const size = Size();
    save()
    beginPath()
    fillStyle('red')
    rect(...add(pos, up(50)), ...v(size.x, 20))
    fill();
    restore()

    save()
    beginPath()
    fillStyle('green')
    rect(...add(pos, up(50)), ...v(size.x * healthPercentage, 20))
    fill();
    restore()

    save()
    beginPath()
    fillStyle(hasTouchedBullet ? 'blue' : 'green')
    rect(...pos, ...size)
    fill();
    restore()

  }
})
