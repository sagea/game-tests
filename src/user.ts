import { Canvas } from './canvas';
import { $$initiate, render, timeDiffS, update } from './animate'
import { isKeyDown } from './keys'
import { add, down, v, left, right, up, zero } from './Vector'
import { fill, fillStyle, restore, save, rect, beginPath, closePath } from './draw'
import { query, Component, createComponent, addEntity } from './modules/ecs';

declare module './modules/ecs' {
  export interface ComponentList {
    User: Component<'User', {
      speed: number
    }>;
  }
}

$$initiate.once(() => {
  addEntity([
    createComponent('User', {
      speed: 400,
    }),
    createComponent('Position', zero()),
    createComponent('Size', v(50, 50)),
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
    beginPath()
    rect(...Position(), ...Size());
    fillStyle('black')
    fill()
    closePath();
    restore()
  }
})

