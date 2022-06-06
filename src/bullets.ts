import { $$initiate, render, timeDiffS, timeMS, update } from './animate.ts'
import { createHitBoxComponent, updateHitboxTransform } from './hitbox.ts'
import { isKeyDown } from './keys.ts'
import { add, v, right, Vector } from './Vector.ts'
import { damageEnemy } from './enemy.ts'
import { fill, fillStyle, restore, save, rect, beginPath } from './draw.ts'
import { DeleteQueueManager } from './components/DeleteQueueManager.ts';
import { Position, Size } from './components/basic.ts';

import { addEntity, Component, query, creator } from './modules/ecs/mod.ts';
declare module './modules/ecs/mod.ts' {
  export interface ComponentList {
    UserBullet: Component<'UserBullet', {
      speed: number;
      status: 'ACTIVE' | 'INACTIVE';
    }>;
    UserBulletManager: Component<'UserBulletManager', {
      lastBulletFiredTime: number;
    }>
  }
}

const UserBullet = creator('UserBullet');
const UserBulletManager = creator('UserBulletManager');

$$initiate.once(() => {
  addEntity([
    UserBulletManager({
      lastBulletFiredTime: 0,
    }),
  ])
})

const createBullet = (pos: Vector) => {
  const size = v(10, 10);
  addEntity([
    UserBullet({
      speed: 700,
      status: 'ACTIVE',
    }),
    Position(pos),
    Size(size),
    DeleteQueueManager({ markedForDeletion: false }),
    createHitBoxComponent('UserBullet', pos, size),
  ]);
  
}

const calculateBulletSpeedForFrame = (speed: number) => speed * timeDiffS()

const spawnBullet = () => {
  for (let { UserBulletManager } of query(['UserBulletManager'])) {
    if (!isKeyDown('Space')) return;
    if ((timeMS() - UserBulletManager().lastBulletFiredTime) < 100) return;
    UserBulletManager({ lastBulletFiredTime: timeMS() });
    for (let { Position } of query(['User', 'Position'])) {
      createBullet(Position())
    }
  }
}

const moveBullet = () => {
  for (let { UserBullet, Position, Size, Hitbox } of query(['UserBullet', 'Position', 'Size', 'Hitbox'])) {
    const { speed } = UserBullet();
    Position(add(Position(), right(calculateBulletSpeedForFrame(speed))))
    updateHitboxTransform(Hitbox, Position(), Size());
  }
}

const removeBullet = () => {
  for (let { Position, DeleteQueueManager } of query(['UserBullet', 'Position', 'DeleteQueueManager'])) {
    if (Position().x < 1920) return;
    DeleteQueueManager({ markedForDeletion: true });
  }
}

const bulletEnemyManager = () => {
  const enemies = [...query(['Enemy', 'EntityId'])];
  for (const { Hitbox, DeleteQueueManager } of query(['UserBullet', 'EntityId', 'Hitbox', 'DeleteQueueManager'])) {
    const { entityInteractions } = Hitbox();
    const firstInteractedEnemeyId = entityInteractions.find((entityId) => enemies.some(({ EntityId }) => entityId === EntityId().id));
    if (firstInteractedEnemeyId) {
      damageEnemy(firstInteractedEnemeyId, 20)
      DeleteQueueManager({ markedForDeletion: true });
    }
  }
}

update
  .add(
    spawnBullet,
    moveBullet,
    bulletEnemyManager,
    removeBullet,
  )


render
  .add(() => {
    for (let { Position, Size } of query(['UserBullet', 'Position', 'Size'])) {
      save()
      beginPath()
      rect(...Position(), ...Size())
      fillStyle('black')
      fill()
      restore()
    }
  });
