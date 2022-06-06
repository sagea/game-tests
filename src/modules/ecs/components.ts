import { NormalizeUnion } from '../../utilities/types.ts';

export const ComponentNameSymbol = Symbol('ECS_Component_Name');

export type Component<Name extends string, T> = NormalizeUnion<{ [ComponentNameSymbol]: Name } & T>
export type DataOnly<T> = Omit<T, typeof ComponentNameSymbol>;
export interface ComponentList {
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

export const creator = <T extends keyof ComponentList>(item: T) => (data: DataOnly<ComponentList[T]>): ComponentList[T] => ({
  [ComponentNameSymbol]: item,
  ...data,
});