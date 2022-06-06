import { NormalizeUnion } from '../../utilities/types.ts';
  const s = Symbol('__Component_Symbol__');
export const Component = <T>() => {
  const returnMethod = (data: T) => {
    return {
      [s]: returnMethod,
      ...data,
    }
  }
  return returnMethod;
}
type AnyComponentMethod = (...args: any[]) => Record<typeof s | string, any>;
export type ComponentInstance<T extends AnyComponentMethod> = ReturnType<T>;

type O<T> = Omit<T, typeof s>;
type PO<T> = Partial<O<T>>;

export type ComponentEditor<T> = (
  handler?: NormalizeUnion<PO<T>>
) => T;
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

const query = <T extends Record<string, AnyComponentMethod>>(list: T): {
  [K in keyof T]: ComponentEditor<ComponentInstance<T[K]>>
} => {
  return '' as any;
}

const Foo = Component<{ a: string }>();
const Bar = Component<{ a: string }>();
const { foo, bar } = query({ foo: Foo, bar: Bar })

foo({ a: 'woah' });
// const FooComponent = Component<{ a: string, b: string }>();

// const map = new Map<() => unknown, any>();

// type m = (...args: any[]) => Record<typeof s | string, any>;
// const query = <T extends Record<string, m>>(list: T): { [A in keyof T]: NormalizeUnion<Omit<ReturnType<T[A]>, typeof s>> } => {
//     const entries = Object.entries(list);
//     const items = entries.map(([key, value]) => [key, map.get(value)]);
//     return Object.fromEntries(items);
// }

// const { foo } = query({ foo: FooComponent })
// console.log('foo', foo);

