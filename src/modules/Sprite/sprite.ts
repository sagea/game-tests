import { Component, ComponentInstanceEditor, ComponentInstance } from '../ecs/mod.ts';
import { range } from '../generics/mod.ts';
import { SpriteMatrix } from './spriteMatrix.ts';
import { Vector } from '../../Vector.ts';

export const Sprite = Component<{
  active: boolean,
  matrix: SpriteMatrix,
  activeRow: number,
  activeCol: number,
  interval: number,
  lastTime: number,
}>();

export type SpriteInstance = ComponentInstance<typeof Sprite>
export type SpriteInstanceEdit = ComponentInstanceEditor<typeof Sprite>;
export const spriteSetRow = (sprite: Readonly<SpriteInstance>, row: number): SpriteInstance => {
  if (!sprite.active) {
    return {
      ...sprite,
      active: true,
      activeCol: 0,
      activeRow: row,
    }
  }
  if (sprite.activeRow === row) {
    return sprite;
  }
  return {
    ...sprite,
    activeCol: 0,
    activeRow: row,
    lastTime: 0,
  }
}
export const spritePoll = (sprite: Readonly<SpriteInstance>, deltaTime: number): SpriteInstance => {
  const {
    lastTime,
    interval,
    matrix,
    activeRow,
    activeCol,
    active
  } = sprite;
  if (active === false) {
    return sprite;
  }
  const l = lastTime + deltaTime;
  if (l < interval) return { ...sprite, lastTime: l };
  const steps = Math.floor(l / interval);
  const leftover = l % interval;
  const maxCol = matrix[activeRow].length;
  let nextCol = activeCol;
  for (const _ of range(steps)) {
    nextCol += 1;
    if (nextCol >= maxCol) {
      nextCol = 0;
    }
  }
  return {
    ...sprite,
    lastTime: leftover,
    activeCol: nextCol,
  }
}

export const getSpritePos = ({ matrix, activeCol, activeRow }: Readonly<SpriteInstance>): Vector => {
  return matrix[activeRow][activeCol] as Vector;
}