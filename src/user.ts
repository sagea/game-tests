import { Canvas } from './canvas.ts';
import { $$initiate, render, timeDiffS, update } from './animate.ts'
import { keyDown, KeyCodes } from './modules/Keyboard/mod.ts'
import { add, down, v, left, right, up, zero } from './Vector.ts'
import { restore, save, drawImage } from './draw.ts'
import { query, Component, addEntity } from './modules/ecs/mod.ts';
import { Position, Size } from './components/basic.ts'
import {resources} from './resources.ts';

export const User = Component<{ speed: number }>();
export const UserAnimation = Component<{
  row: number,
  column: number,
  interval: number,
}>();

$$initiate.once(() => {
  addEntity([
    User({
      speed: 400,
    }),
    Position(zero()),
    Size(v(50, 50)),
    UserAnimation({
      row: 0,
      column: 0,
      interval: 300,
    })
  ]);
})

const calculateSpeedForFrame = (speed: number): number => speed * timeDiffS();

update.add(() => {
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
})
// update.add(() => {
//   justPressed('KeyW')
// })


render.add(() => {
  for (const { position } of query({ user: User, position: Position })) {
    save()
    drawImage(resources.USER_IMAGE, ...position())
    restore()
  }
})

