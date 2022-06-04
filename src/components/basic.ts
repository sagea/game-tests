import * as ecs from '../modules/ecs/index.ts';
import { Vector } from '../Vector.ts';

declare module '../modules/ecs' {
  export interface ComponentList {
    Position: ecs.Component<'Position', Vector>;
    Size: ecs.Component<'Size', Vector>;
  }
}
