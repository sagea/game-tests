import { Vector, v } from '../../Vector.ts';
import { range } from '../generics/mod.ts';

export type SpriteMatrix = Vector[][];
export const createSpriteMatrix = (rowCount: number, colCount: number): SpriteMatrix => {
  return [...range(rowCount)]
    .map(row => {
      return [...range(colCount)]
        .map(col => v(col, row))
    })
}