import * as ecs from '../modules/ecs';
import { Vector } from '../Vector';

declare module '../modules/ecs' {
  export interface ComponentList {
    Position: ecs.Component<'Position', Vector>;
    Size: ecs.Component<'Size', Vector>;
  }
}
