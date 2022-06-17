import { Counter } from '../../utilities/counter.ts';
const methods = new Map<number, any>();
const idCounter = counter();

export const registerMethod = (method: string): number => {
  const id = idCounter();
  eval(`
    (() => {
      methods.set(${id}, ${method});
    })();
  `);
  return id;
}

export const execSingle = (id: number, args: any[]) => {
  const method = methods.get(id);
  
}
export const execMany = (methods: Array<[number, any[]]>) => {
  for (let [id, args] of methods) {
    execSingle(id, args);
  }
};