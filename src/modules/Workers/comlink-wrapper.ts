import * as comlink from 'https://unpkg.com/comlink/dist/esm/comlink.mjs';

export const wrap = (...args) => {
  return comlink.wrap(...args);
}
export const transfer = (...args) => {
  return comlink.transfer(...args)
}

const exposedMethods = new Map();
export const expose = (a: any, b?: any) => {
  const event = new Event('message', { })
  event.data = {
    id: Math.random(),
    type: 'RELEASE'
  } 
  self.dispatchEvent(event);

  for (const [name, method] of Object.entries(a)) {
    // if (exposedMethods.has(name)) {
    //   throw new Error(`Worker already exposed method with name ${name}`);
    // }
    exposedMethods.set(name, method);
  }
  const items = Object.fromEntries(exposedMethods);
  comlink.expose(items, b);
}
