import { Component, ComponentNameSymbol, ComponentList, DataOnly } from '../components.ts';

declare module '../components.ts' {
  export interface ComponentList {
    EntityId: Component<'EntityId', { id: number }>
  }
}

export const createEntityId = (data: DataOnly<ComponentList['EntityId']>): ComponentList['EntityId'] => ({
  [ComponentNameSymbol]: 'EntityId',
  ...data,
})
