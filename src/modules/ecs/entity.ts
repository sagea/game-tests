import { ComponentEntityManager, ComponentStateManager, AnyComponentMethod, ComponentInstance, cns, ComponentEditor } from './components.ts';
import { Counter } from '../../utilities/counter.ts';
import { EntityId } from './components/EntityId.component.ts';

export type Entity = {
  id: number;
  components: Map<AnyComponentMethod, ComponentEditor<ComponentInstance<AnyComponentMethod>>>;
}

export const EntityList = () => {
  const entityIdCounter = Counter();
  const entities = new Map<number, Entity>();
  const componentEntityMapping = new ComponentEntityManager();

  const addEntity = <T extends ComponentInstance<AnyComponentMethod>>(
    components: T[],
  ) => {
    const id = entityIdCounter() as number;
    const entity: Entity = {
      id,
      components: new Map(),
    }
    entities.set(entity.id, entity);
    addComponentToEntity(id, EntityId({ id }));
      for (const component of components) {
      addComponentToEntity(id, component);
    }
    return entity;
  }
  const addComponentToEntity = <T extends ComponentInstance<AnyComponentMethod>>(entityId: number, component: T) => {
    const componentName = component[cns];
    const entity = entities.get(entityId);
    if (!entity) return;
    entity.components.set(componentName, ComponentStateManager(component));
    componentEntityMapping.appendItem(componentName, entityId);
  }

  function removeEntity(id: number) {
    const entity = entities.get(id)
    if (!entity) return
    const { components } = entity;
    entities.delete(id);
    for (const [componentName] of components) {
      componentEntityMapping.removeItem(componentName, id);
    }
  }

  function count<T extends AnyComponentMethod>(
    componentFilter: T[],
  ): number {
    const componentMapping: number[][] = []
    for (const componentName of componentFilter) {
      const component = componentEntityMapping.get(componentName);
      if (component.length === 0) {
        return 0
      }
      componentMapping.push(component);
    }
    const entityIds = intersectionBetweenOrderedIntegerLists(componentMapping);
    return entityIds.length;
  }

  function* query<T extends Record<string, AnyComponentMethod>>(
    componentFilter: T,
    filteredUserIds?: number[],
  ): Generator<
    {
      [K in keyof T]: ComponentEditor<ComponentInstance<T[K]>>
    },
    void,
    unknown> {
      let componentMapping: number[][] = []
      if (filteredUserIds) {
        componentMapping.push(filteredUserIds);
      }
      for (const [, componentName] of Object.entries(componentFilter)) {
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
        for (const [remappedName, componentName] of Object.entries(componentFilter)) {
          components[remappedName] = entity.components.get(componentName);
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