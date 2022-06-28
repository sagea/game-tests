import { Canvas } from './canvas.ts';
import { timeDiffS, timeDiffMS } from './modules/loop/mod.ts'
import { keyDown, KeyCodes, justPressed } from './modules/Keyboard/mod.ts'
import { add, down, v, left, right, up, zero, Vector } from './Vector.ts'
import { query, Component, addEntity, AppPlugin } from './modules/ecs/mod.ts';
import { Position, Size } from './components/basic.ts'
import {resources} from './resources.ts';
import { Sprite, spritePoll, spriteSetRow, createSpriteMatrix, getSpritePos } from './modules/Sprite/mod.ts';
import { createMethod } from './modules/Sprite/mod.ts'

export const User = Component<{ speed: number }>();

const calculateSpeedForFrame = (speed: number): number => speed * timeDiffS();

export const spawnUserSystem = () => {
  addEntity([
    User({
      speed: 400,
    }),
    Position(zero()),
    Size(v(50, 50)),
    Sprite({
      active: false,
      matrix: createSpriteMatrix(2, 4),
      activeRow: 0,
      activeCol: 0,
      lastTime: 0,
      interval: 300,
    })
  ]);
};

export const moveUserSystem = () => {
  for (const { user, position, size } of query({ user: User, position: Position, size: Size })) {
    if (keyDown(KeyCodes.KeyW)) {
      position(add(position(), up(calculateSpeedForFrame(user().speed))))
    }
    if (keyDown(KeyCodes.KeyS)) {
      position(add(position(), down(calculateSpeedForFrame(user().speed))))
    }
    if (keyDown(KeyCodes.KeyA)) {
      position(add(position(), left(calculateSpeedForFrame(user().speed))))
    }

    if (keyDown(KeyCodes.KeyD)) {
      position(add(position(), right(calculateSpeedForFrame(user().speed))))
    }
    const canvas = Canvas()
    const [width, height] = size();
    const [x, y] = position();
    position(v(
      Math.max(0, Math.min(x, canvas.width - width)),
      Math.max(0, Math.min(y, canvas.height - height))
    ));
  }
}

export const userAnimationSystem = () => {
  for (const { sprite } of query({ user: User, sprite: Sprite })) {
    const last = sprite();
    if (!last.active) {
      sprite(spriteSetRow(sprite(), 0))
    }
    if(justPressed(KeyCodes.KeyW)) {
      sprite(spriteSetRow(sprite(), 1))
    }
    if(justPressed(KeyCodes.KeyS)) {
      sprite(spriteSetRow(sprite(), 0))
    }
    sprite(spritePoll(sprite(), timeDiffMS()))
  }
}

const drawUser = createMethod((ctx, imageUrl: string, pos: Vector, spritePos: Vector) => {
  performance.mark('drawUser')
  const width = 32;
  const height = 52;
  const col = spritePos.x;
  const row = spritePos.y;
  // const s = sprite();
  const { x, y } = pos;
  ctx.save()
  ctx.drawImage(getResource(imageUrl), col * width, row * height, width, height, x, y, width, height);
  ctx.restore()
  performance.mark('drawUser')
})
export const renderUserSystem = () => {
  for (const { position, sprite } of query({ user: User, position: Position, sprite: Sprite })) {
    drawUser(resources.USER_IMAGE, position(), getSpritePos(sprite()))
    // d.markStart('render user')
    // d.save()
    // const width = 32;
    // const height = 52;
    // // const s = sprite();
    // const [col, row] = getSpritePos(sprite())
    // const [ x, y ] = position();
    // d.drawImage(resources.USER_IMAGE, col * width, row * height, width, height, x, y, width, height);
    // d.restore()
    // d.markEnd('render user')
  }
}

export const userPlugin: AppPlugin = (app) => {
  app
    .addInitSystem(spawnUserSystem)
    .addSystem(moveUserSystem)
    .addSystem(userAnimationSystem)
    .addRenderSystem(renderUserSystem);
}