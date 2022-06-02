import { ComponentList, ComponentStateManager, ComponentNameSymbol, ComponentListStateManagers, createComponent } from './components';
import { Counter } from '../../utilities/counter';

let entityIdCounter = Counter();
export type Entity = {
  id: number;
  components: Partial<ComponentListStateManagers>;
}

export const entities = new Map<number, Entity>();
export const componentEntityMapping = new Map<string, number[]>();

export const addEntity = <T extends ComponentList[keyof ComponentList]>(components: T[]) => {
  const id = entityIdCounter.next().value;
  const entity: Entity = {
    id,
    components: {},
  }
  const defaultComponents = [createComponent('EntityId', { id })];
  entities.set(entity.id, entity);
  for (let component of [...components, ...defaultComponents]) {
    addComponentToEntity(id, component);
  }
  return entity;
}
export const addComponentToEntity = <T extends ComponentList[keyof ComponentList]>(entityId: number, component: T) => {
  const componentName = component[ComponentNameSymbol];
  const componentMapping = componentEntityMapping.get(componentName) || [];
  const entity = entities.get(entityId);
  entity.components[componentName] = ComponentStateManager(component);
  componentEntityMapping.set(componentName, [...componentMapping, entityId]);
}

export function removeEntity(id: number) {
  const { components } = entities.get(id);
  entities.delete(id);
  for (let componentName of Object.keys(components)) {
    const idmappings = componentEntityMapping.get(componentName)
      .filter(i => i !== id);
    componentEntityMapping.set(componentName, idmappings);
  }
}

export function count<T extends keyof ComponentListStateManagers>(
  componentFilter: T[],
): number {
  let componentMapping: number[][] = []
  for (let componentName of componentFilter) {
    const component = componentEntityMapping.get(componentName);
    if (!component || component.length === 0) {
      return 0
    };
    componentMapping.push(component);
  }
  const entityIds = intersectionBetweenOrderedIntegerLists(componentMapping);
  return entityIds.length;
}
export function* query<T extends keyof ComponentListStateManagers>(
  componentFilter: T[],
  filteredUserIds?: number[],
): Generator<
  { [id in T]: ComponentListStateManagers[id] },
  void,
  unknown> {
    let componentMapping: number[][] = []
    if (filteredUserIds) {
      componentMapping.push(filteredUserIds);
    }
    for (let componentName of componentFilter) {
      const component = componentEntityMapping.get(componentName);
      if (!component || component.length === 0) {
        return
      };
      componentMapping.push(component);
    }
    componentMapping = componentMapping.sort((a, b) => a.length - b.length)

    const entityIds = intersectionBetweenOrderedIntegerLists(componentMapping);
    for (let entityId of entityIds) {
      const entity = entities.get(entityId);
      const components: any = {};
      for (let componentName of componentFilter) {
        components[componentName] = entity.components[componentName];
      }
      yield components;
    }
}

const intersectionBetweenOrderedIntegerLists = (intLists: number[][]) => {
  // todo: Rename last as it's not the last component mapping but more of the filtered item
  // IE: intersected list
  let last = intLists[0];
  for (let i = 1; i < intLists.length; i++) {
    const current = intLists[i]
    let matches = [];
    const lastLength = last.length;
    const currentLength = current.length;
    let currentIndexStartingPoint = 0;
    for (let lastIndex = 0; lastIndex < lastLength; lastIndex++) {
      const lastId = last[lastIndex]
      for (let currentIndex = currentIndexStartingPoint; currentIndex < currentLength; currentIndex++) {
        const currentId = current[currentIndex];
        if (lastId === currentId) {
          currentIndexStartingPoint = currentIndex + 1;
          matches.push(lastId);
          break;
        } else if (lastId < currentId) {
          break;
        } else if (lastId > currentId) {
          currentIndexStartingPoint = currentIndex;
        }
      }
    }
    if (matches.length === 0) {
      return [];
    }
    last = matches;
  }
  return last;
}