import { ComponentList, ComponentStateManager, ComponentNameSymbol, ComponentListStateManagers, createComponent } from './components.ts';
import { Counter } from '../../utilities/counter.ts';

export type Entity = {
  id: number;
  components: Partial<ComponentListStateManagers>;
}

export const EntityList = () => {
  const entityIdCounter = Counter();
  const entities = new Map<number, Entity>();
  const componentEntityMapping = new Map<string, number[]>();

  const addEntity = <T extends ComponentList[keyof ComponentList]>(
    components: T[],
  ) => {
    const id = entityIdCounter() as number;
    const entity: Entity = {
      id,
      components: {},
    }
    const defaultComponents = [createComponent('EntityId', { id })];
    entities.set(entity.id, entity);
    for (const component of [...components, ...defaultComponents]) {
      addComponentToEntity(id, component);
    }
    return entity;
  }
  const addComponentToEntity = <T extends ComponentList[keyof ComponentList]>(entityId: number, component: T) => {
    const componentName = component[ComponentNameSymbol];
    const componentMapping = componentEntityMapping.get(componentName) || [];
    const entity = entities.get(entityId);
    if (!entity) return;
    entity.components[componentName] = ComponentStateManager(component);
    componentEntityMapping.set(componentName, [...componentMapping, entityId]);
  }

  function removeEntity(id: number) {
    const entity = entities.get(id)
    if (!entity) return
    const { components } = entity;
    entities.delete(id);
    for (const componentName of Object.keys(components)) {
      const idmappings = (componentEntityMapping.get(componentName) || [])
        .filter(i => i !== id);
      componentEntityMapping.set(componentName, idmappings);
    }
  }

  function count<T extends keyof ComponentListStateManagers>(
    componentFilter: T[],
  ): number {
    const componentMapping: number[][] = []
    for (const componentName of componentFilter) {
      const component = componentEntityMapping.get(componentName) || [];
      if (component.length === 0) {
        return 0
      }
      componentMapping.push(component);
    }
    const entityIds = intersectionBetweenOrderedIntegerLists(componentMapping);
    return entityIds.length;
  }
  function* query<T extends keyof ComponentListStateManagers>(
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
      for (const componentName of componentFilter) {
        const component = componentEntityMapping.get(componentName) || [];
        if (!component || component.length === 0) {
          return
        }
        componentMapping.push(component);
      }
      componentMapping = componentMapping.sort((a, b) => a.length - b.length)

      const entityIds = intersectionBetweenOrderedIntegerLists(componentMapping);
      for (const entityId of entityIds) {
        const entity = entities.get(entityId);
        if (!entity) {
          continue;
        }
        const components: any = {};
        for (const componentName of componentFilter) {
          components[componentName] = entity.components[componentName];
        }
        yield components;
      }
  }

  return {
    addEntity,
    removeEntity,
    addComponentToEntity,
    count,
    query,
  }
}

const globalEntityList = EntityList();

export const addEntity = globalEntityList.addEntity;
export const removeEntity = globalEntityList.removeEntity;
export const addComponentToEntity = globalEntityList.addComponentToEntity;
export const count = globalEntityList.count;
export const query = globalEntityList.query;


const intersectionBetweenOrderedIntegerLists = (intLists: number[][]) => {
  // todo: Rename last as it's not the last component mapping but more of the filtered item
  // IE: intersected list
  let last = intLists[0];
  for (let i = 1; i < intLists.length; i++) {
    const current = intLists[i]
    const matches = [];
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