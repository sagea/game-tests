export type AppPlugin = (app: App) => any | Promise<any>;
export type BasicSystem = (app: App) => any | Promise<any>;
export type OrderedSystem = [number, BasicSystem];
export type System = BasicSystem | OrderedSystem;
export type AppEventHandler = () => any;
type SystemTypes = 'init' | 'system' | 'render' | 'final';
type AppEvents = `pre${SystemTypes | 'run'}` | `post${SystemTypes | 'run'}`;
export const isOrderedSystem = (item: System): item is OrderedSystem => {
  return Array.isArray(item)
}



export class App {
  #runCount = 0;
  #systems: Record<SystemTypes, OrderedSystem[]> = {
    init: [],
    system: [],
    render: [],
    final: [],
  }
  #plugins: AppPlugin[] = [];
  #events: Record<AppEvents, Set<AppEventHandler>> = {
    prerun: new Set(),
    preinit: new Set(),
    postinit: new Set(),
    presystem: new Set(),
    postsystem: new Set(),
    prerender: new Set(),
    postrender: new Set(),
    prefinal: new Set(),
    postfinal: new Set(),
    postrun: new Set(),
  };
  addListener(event: AppEvents, handler: AppEventHandler) {
    this.#events[event].add(handler);
    return () => this.removeListener(event, handler);
  }

  removeListener(event: AppEvents, handler: AppEventHandler) {
    this.#events[event].delete(handler);
  }

  #dispatchEvent(event: AppEvents) {
    this.#events[event].forEach(handler => handler());
  }

  #toOrderedSystem(system: System): OrderedSystem {
    if (isOrderedSystem(system)) return system;
    return [0, system];
  }

  #runSystem<T extends SystemTypes>(systemType: T) {
    this.#dispatchEvent(`pre${systemType}`)
    this.#systems[systemType].forEach(([, system ]) => system(this));
    this.#dispatchEvent(`post${systemType}`)
  }
  addPlugin(plugin: AppPlugin) {
    this.#plugins.push(plugin);
    return this;
  }
  addSystemByType(systemType: SystemTypes, ...manySystems: System[]) {
    const orderedSystems = manySystems.map(system => this.#toOrderedSystem(system));
    this.#systems[systemType] = [
      ...this.#systems[systemType],
      ...orderedSystems,
    ].sort((a, b) => a[0] - b[0]);
    return this;
  }

  addInitSystem(...manySystems: System[]) {
    return this.addSystemByType('init', ...manySystems);
  }

  addSystem(...manySystems: System[]) {
    return this.addSystemByType('system', ...manySystems);
  }

  addRenderSystem(...manySystems: System[]) {
    return this.addSystemByType('render', ...manySystems);
  }
  
  addFinalSystem(...manySystems: System[]) {
    return this.addSystemByType('final', ...manySystems);
  }


  async run() {
    const firstRun = this.#runCount === 0;
    this.#runCount++;
    if (firstRun) {
      for (const plugin of this.#plugins) {
        await plugin(this);
      }
    }
    this.#runCount++;
    this.#dispatchEvent('prerun')
    if (firstRun) {
      this.#dispatchEvent(`preinit`)
      for (let [,s] of this.#systems.init) {
        const a = s(this);
        if (a && a instanceof Promise) await a;
      }
      this.#dispatchEvent(`postinit`)
    }
    
    this.#dispatchEvent('presystem')
    for (let [,s] of this.#systems.system) {
      const a = s(this);
      if (a && a instanceof Promise) await a;
    }
    this.#dispatchEvent('postsystem')

    this.#dispatchEvent('prerender')
    for (let [,s] of this.#systems.render) {
      const a = s(this);
      if (a && a instanceof Promise) await a;
    }
    this.#dispatchEvent('postrender')

    this.#dispatchEvent('prefinal')
    for (let [,s] of this.#systems.final) {
      const a = s(this);
      if (a && a instanceof Promise) await a;
    }
    this.#dispatchEvent('postfinal')

    this.#dispatchEvent('postrun')
  }
}
