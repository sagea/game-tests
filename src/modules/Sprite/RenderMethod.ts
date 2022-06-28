import { globalCounter } from '../../utilities/counter.ts';

export type MethodResponse = {
  id: number;
  methodString: string;
  args: any[];
}
export type Listener = (id: number, args: any[]) => any;

const registeredMethods = new Map<number, string>();
const listeners = new Set<Listener>();

export const addListener = (callback: Listener) => {
  listeners.add(callback);
  return () => removeListener(callback);
}

export const removeListener = (callback: Listener) => {
  listeners.delete(callback);
}

export const getRegisteredMethod = (id: number) => {
  return registeredMethods.get(id) as string;
}

export const createMethod = (method: (...args: any[]) => void) => {
  const id = globalCounter();
  registeredMethods.set(id, method.toString());
  return (...args: any[]) => {
    for (const listener of listeners) {
      listener(id, args);
    }
  }
}
