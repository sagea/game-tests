import { Canvas } from './canvas.ts';
import { $$initiate, render, timeDiffS, update } from './animate.ts'
import { isKeyDown } from './keys.ts'
import { add, down, v, left, right, up, zero } from './Vector.ts'
import { restore, save, drawImage } from './draw.ts'
import { query, Component, addEntity, creator } from './modules/ecs/mod.ts';
import { Position, Size } from './components/basic.ts'
import {resources} from './resources.ts';

declare module './modules/ecs/mod.ts' {
  export interface ComponentList {
    User: Component<'User', {
      speed: number
    }>;
  }
}

export const User = creator('User');

$$initiate.once(() => {
  addEntity([
    User({
      speed: 400,
    }),
    Position(zero()),
    Size(v(50, 50)),
  ]);
})

const calculateSpeedForFrame = (speed: number): number => speed * timeDiffS();

update.add(() => {
  for (let { User, Position, Size } of query(['User', 'Position', 'Size'])) {
    if (isKeyDown('KeyW')) {
      Position(add(Position(), up(calculateSpeedForFrame(User().speed))))
    }
    if (isKeyDown('KeyS')) {
      Position(add(Position(), down(calculateSpeedForFrame(User().speed))))
    }
    if (isKeyDown('KeyA')) {
      Position(add(Position(), left(calculateSpeedForFrame(User().speed))))
    }

    if (isKeyDown('KeyD')) {
      Position(add(Position(), right(calculateSpeedForFrame(User().speed))))
    }
    const canvas = Canvas()
    const [width, height] = Size();
    const [x, y] = Position();
    Position(v(
      Math.max(0, Math.min(x, canvas.width - width)),
      Math.max(0, Math.min(y, canvas.height - height))
    ));
  }
})

render.add(() => {
  for (let { Position, Size } of query(['Position', 'User', 'Size'])) {
    save()
    drawImage(resources.USER_IMAGE, ...Position())
    restore()
  }
})

