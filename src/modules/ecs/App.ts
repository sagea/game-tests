import { Entity, EntityList } from './entity.ts';
import { isFunction } from '../../utilities/types.ts';

export type AppCommands = {
  addEntity: () => {};
  removeEntity: () => {};
  addComponentToEntity: () => {};
  query: () => {};
  count: () => {};
}

type SystemMethod = () => any;
const isSystemMethod = (value: any): value is SystemMethod => isFunction(value);
const App = () => {
  const startSystems = new Set<SystemMethod>();
  const systems = new Set<SystemMethod>();
  const renderSystems = new Set<[number, SystemMethod]>();
  const addStartSystem = (handler: SystemMethod) => {
    startSystems.add(handler)
  }
  const addSystem = (handler: SystemMethod) => {
    systems.add(handler);
  }
  const addRenderSystem = (handler: SystemMethod | [number, SystemMethod]) => {
    handler = isSystemMethod(handler) ? [0, handler] : handler;
    
  }
  run() {
    for (let startupSystems of startSystems) {
      startSystems.
    }
  }
}

