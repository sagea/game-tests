
export type Resource = ['url', string];
export type ResourceId = number;
export type ShaderId = number;
export type ShaderExecuteArgs = [ShaderId, any[]]
export type TWorker = {
  setCanvas(canvas: OffscreenCanvas): Promise<void>;
  registerResource(resource: Resource): Promise<ResourceId>;
  unregisterResource(id: ResourceId): Promise<void>;
  registerShader(shader: string): Promise<ShaderId>;
  unregisterShader(): Promise<void>;
  executeShader(shaderId: ShaderExecuteArgs[0], args: ShaderExecuteArgs[1]): Promise<void>;
  executeManyShaders(execArgs: ShaderExecuteArgs[]): Promise<void>;
}

export type ShadeRunner = {
  queue: (...args: any[]) => void;
  now: (...args: any[]) => Promise<void>;
}

export type TClient = Pick<
  TWorker,
  'setCanvas' |
  'registerResource' |
  'unregisterResource'
  > & {
    createShader(shader: string): (ctx: OffscreenCanvasRenderingContext2D, ...args: any[]) => ShadeRunner;
    renderQueuedShaders(): Promise<void>;
}
