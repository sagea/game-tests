import { NormalizeUnion } from '../../utilities/types.ts';

export const cns = Symbol('__Component_Symbol__');

export const Component = <T>() => {
  const returnMethod = (data: T) => {
    return {
      [cns]: returnMethod,
      ...data,
    }
  }
  return returnMethod;
}

export type AnyComponentMethod = (...args: any[]) => Record<typeof cns | string, any>;
export type ComponentInstance<T extends AnyComponentMethod> = ReturnType<T>;
export type ComponentEditor<T> = (
  handler?: NormalizeUnion<PO<T>>
) => T;
export type ComponentInstanceEditor<T extends AnyComponentMethod> = ComponentEditor<ComponentInstance<T>>;

type O<T> = Omit<T, typeof cns>;
type PO<T> = Partial<O<T>>;

export const ComponentStateManager = <T>(
  initialState: T
): ComponentEditor<T> => {
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

export class ComponentEntityManager extends Map<AnyComponentMethod, number[]> {
  get(component: AnyComponentMethod): number[] {
    const list = super.get(component);
    if (list) {
      return list;
    }
    const newList: number[] = []
    super.set(component, newList);
    return newList;
  }
  appendItem(component: AnyComponentMethod, item: number) {
    this.get(component).push(item);
  }
  removeItem(component: AnyComponentMethod, item: number) {
    const list = this.get(component);
    this.set(component, list.filter(i => i !== item));
  }
}