import { $$initiate, render, timeDiffS, timeMS, update } from './animate'
import { createHitBoxComponent, updateHitboxTransform } from './hitbox'
import { isKeyDown } from './keys'
import { add, v, right, Vector } from './Vector'
import { damageEnemy } from './enemy'
import { fill, fillStyle, restore, save, rect, beginPath } from './draw'

import { addEntity, Component, createComponent, query } from './modules/ecs';
declare module './modules/ecs' {
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

$$initiate.once(() => {
  addEntity([
    createComponent('UserBulletManager', {
      lastBulletFiredTime: 0,
    }),
  ])
})

const createBullet = (pos: Vector) => {
  const size = v(10, 10);
  addEntity([
    createComponent('UserBullet', {
      speed: 700,
      status: 'ACTIVE',
    }),
    createComponent('Position', pos),
    createComponent('Size', size),
    createComponent('DeleteQueueManager', { markedForDeletion: false }),
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
