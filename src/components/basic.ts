import { Component, creator } from '../modules/ecs/mod.ts';
import { Vector } from '../Vector.ts';

declare module '../modules/ecs/mod.ts' {
  export interface ComponentList {
    Position: Component<'Position', Vector>;
    Size: Component<'Size', Vector>;
  }
}


export const Position = creator('Position');
export const Size = creator('Size');
