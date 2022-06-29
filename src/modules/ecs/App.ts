export const baseStages = ['start', 'init', 'main', 'end'] as const;
const errors = {
    stageAlreadyExists: (stageName: string) => new Error(`Stage with the name "${stageName}" already exists.`),
    stageDoesNotExist: (stageName: AppStage) => new Error(`Stage with the name "${stageName}" does not exist.`),
    cantAddStageBeforeStart: () => new Error(`Not allowed. Can't add any stages before start stage`),
    cantAddStageAfterEnd: () => new Error(`Not allowed. Can't add any stages after end stage`),
} as const;

export type AppPlugin<T,> = (app: App<T>) => any | Promise<any>;
export type System<T, > = (app: App<T>) => any | Promise<any>;
export type BaseStage = typeof baseStages[number];
export type AppStage = BaseStage | Omit<string, BaseStage>;

export type AppSystemStage = 'pre' | 'main' | 'post';

export interface AppSystem {
    order: number;
    appStage: AppStage;
    system: System<any>;
    runOnce: boolean;
    appSystemStage: AppSystemStage;
}

type AddSystemOptions = {
  stage?: 'pre' | 'post',
  order?: number,
  once?: boolean,
}

type AddSystemSystems = [System<any>, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?, System<any>?];
type AddSystemArguments = [string, AddSystemOptions, ...AddSystemSystems]
  | [string, ...AddSystemSystems]
  | [AddSystemOptions, ...AddSystemSystems]
  | [...AddSystemSystems];
export class App<State extends Record<string, any>> {
    state = {} as State;
    #runcount = 0;
    #stages = new Map<AppStage, Set<AppSystem>>(baseStages.map(stage => [stage, new Set()]));
    #plugins: AppPlugin<any>[] = []
    hasStage(stageName: AppStage) {
      return this.#stages.has(stageName);
    }
    addStage(stageName: string) {
        return this.addStageBefore(stageName, 'end');
    }
    addStageBefore(stageName: string, otherStageName: string) {
        if (this.hasStage(stageName)) throw errors.stageAlreadyExists(stageName)
        if (!this.hasStage(otherStageName)) throw errors.stageDoesNotExist(otherStageName)
        if (otherStageName === 'start') throw errors.cantAddStageBeforeStart()

        const entries = [...this.#stages];
        const index = entries.findIndex((item) => item[0] === otherStageName);
        entries.splice(index - 1, 0, [stageName, new Set()]);
        this.#stages = new Map(entries);
        return this;
    }

    addStageAfter(stageName: string, otherStageName: AppStage) {
        if (this.hasStage(stageName)) throw errors.stageAlreadyExists(stageName);
        if (!this.hasStage(otherStageName)) throw errors.stageDoesNotExist(otherStageName)
        if (otherStageName === 'end') throw errors.cantAddStageAfterEnd()

        const entries = [...this.#stages];
        const index = entries.findIndex((item) => item[0] === otherStageName);
        entries.splice(index, 0, [stageName, new Set()]);
        this.#stages = new Map(entries);
        return this;
    }

    addAppSystem(appSystem: AppSystem) {
        const stages = this.#stages.get(appSystem.appStage) || new Set()
        const list = [...stages, appSystem]
            .sort((a, b) => {
                const ass = a.appSystemStage;
                const bss = b.appSystemStage
                if (ass === bss) return a.order - b.order
                if (ass === 'pre') return -1
                if (ass === 'post') return 1
                if (bss === 'pre') return 1
                if (bss === 'post') return -1
                return 0
            });
        this.#stages.set(appSystem.appStage, new Set(list));
        return this;
    }

    addSystem(...args: AddSystemArguments) {
      const appStage = args.find(item => typeof item === 'string') as (string | undefined);
      const systems = args.filter(item => typeof item === 'function') as System<any>[];
      const options = args.find(item => typeof item === 'object') as (AddSystemOptions | undefined);
      if (systems.length === 0) {
        throw new Error(`Missing system`);
      }
      for (const system of systems) {
        const appSystem: AppSystem = {
          appStage: appStage || 'main',
          runOnce: options?.once || false,
          order: options?.order || 0,
          system,
          appSystemStage: options?.stage || 'main',
        };
        this.addAppSystem(appSystem)
      }
      return this
    }

    addPlugin(appPlugin: AppPlugin<any>) {
        this.#plugins.push(appPlugin)
        return this;
    }

    async run() {
        if (this.#runcount === 0) {
            await Promise.all(this.#plugins.map(plugin => plugin(this)));
        }
        this.#runcount += 1;
        for (const [stageName, appSystems] of this.#stages) {
            for (const appSystem of appSystems) {
                const res = appSystem.system(this)
                if (appSystem.runOnce) {
                  this.#stages.get(stageName)!.delete(appSystem);
                }
                if (res instanceof Promise) {
                    await res;
                }
            }
        }
        return this;
    }
}
