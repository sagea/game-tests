import { NormalizeUnion } from '../../utilities/types.ts';

export const ComponentNameSymbol = Symbol('ECS_Component_Name');

export type Component<Name extends string, T> = NormalizeUnion<{ readonly [ComponentNameSymbol]: Name } & T>

export interface ComponentList {
  EntityId: Component<'EntityId', { id: number }>;
}

export type ComponentListStateManagers = {
  [id in keyof ComponentList]: ComponentStateManagerGetSetMethod<ComponentList[id]>
}

type O<T> = Omit<T, typeof ComponentNameSymbol>;
type PO<T> = Partial<O<T>>;

export type ComponentStateManagerGetSetMethod<T> = (
  handler?: NormalizeUnion<PO<T>>
) => T;

export const ComponentStateManager = <T extends ComponentList[keyof ComponentList]>(
  initialState: T
): ComponentStateManagerGetSetMethod<T> => {
  let internalState: T = initialState;
  return (changes?) => {
    if (changes) {
      internalState = {
        ...internalState,
        ...changes,
      };
    }
    return internalState;
  };
}

export const createComponent = <
  TName extends keyof ComponentList,
  T extends NormalizeUnion<O<ComponentList[TName]>>
>(name: TName, def: T): ComponentList[TName] => ({
  [ComponentNameSymbol]: name,
  ...def,
});
