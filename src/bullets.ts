import { timeDiffS, timeMS } from './modules/loop/mod.ts'
import { createHitBoxComponent, updateHitboxTransform, Hitbox } from './hitbox.ts'
import { keyDown, KeyCodes } from './modules/Keyboard/mod.ts'
import { add, v, right, Vector } from './Vector.ts'
import { damageEnemy } from './enemy.ts'
import { DeleteQueueManager } from './components/DeleteQueueManager.ts';
import { Position, Size } from './components/basic.ts';
import { User } from './user.ts';
import { Enemy } from './enemy.ts';
import { createMethod } from './modules/Sprite/mod.ts'

import { AppPlugin, addEntity, Component, EntityId, query } from './modules/ecs/mod.ts';

export const UserBullet = Component<{
  speed: number;
  status: 'ACTIVE' | 'INACTIVE';
}>();

const UserBulletManager = Component<{
  lastBulletFiredTime: number;
}>();

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
  for (const { userBulletManager } of query({ userBulletManager: UserBulletManager })) {
    if (!keyDown(KeyCodes.Space)) return;
    if ((timeMS() - userBulletManager().lastBulletFiredTime) < 100) return;
    userBulletManager({ lastBulletFiredTime: timeMS() });
    for (const { position } of query({ user: User, position: Position })) {
      createBullet(position())
    }
  }
}

const moveBullet = () => {
  for (const { userBullet, position, size, hitbox } of query({ userBullet: UserBullet, position: Position, size: Size, hitbox: Hitbox })) {
    const { speed } = userBullet();
    position(add(position(), right(calculateBulletSpeedForFrame(speed))))
    updateHitboxTransform(hitbox, position(), size());
  }
}

const removeBullet = () => {
  for (const { position, deleteQueueManager } of query({ userBullet: Size, position: Position, deleteQueueManager: DeleteQueueManager})) {
    if (position().x < 1920) return;
    deleteQueueManager({ markedForDeletion: true });
  }
}

const bulletEnemyManager = () => {
  const enemies = [...query({enemy: Enemy, entityId: EntityId })];
  for (const { hitbox, deleteQueueManager } of query({ userBullet: UserBullet, entityId: EntityId, hitbox: Hitbox, deleteQueueManager: DeleteQueueManager })) {
    const { entityInteractions } = hitbox();
    const firstInteractedEnemeyId = entityInteractions.find((entityIdInteraction) => enemies.some(({ entityId }) => entityIdInteraction === entityId().id));
    if (firstInteractedEnemeyId) {
      damageEnemy(firstInteractedEnemeyId, 20)
      deleteQueueManager({ markedForDeletion: true });
    }
  }
}

const bulletManagerSystem = () => {
  addEntity([
    UserBulletManager({
      lastBulletFiredTime: 0,
    }),
  ])
}
const drawBullet = createMethod((ctx, position: Vector, size: Vector) => {
  performance.mark('drawBullet')
  ctx.save()
  ctx.beginPath()
  ctx.rect(position.x, position.y, size.x, size.y)
  ctx.fillStyle = 'black'
  ctx.fill()
  ctx.restore()
  performance.mark('drawBullet')
})

export const bulletRenderSystem = () => {
  for (const { position, size } of query({ userBullet: UserBullet, position: Position, size: Size })) {
    drawBullet(position(), size());
  }
}

export const bulletPlugin: AppPlugin<any> = (app) => {
  app
    .stage('init').once.addSystem(bulletManagerSystem)
    .stage().addSystem(
      spawnBullet,
      moveBullet,
      bulletEnemyManager,
      removeBullet,
    )
    .stage('render').addSystem(bulletRenderSystem);
}