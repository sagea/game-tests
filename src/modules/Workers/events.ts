
type Target = ['window'] | ['document'] | ['querySelector', string];
export const e = {
  window: (): Target => ['window'],
  document: (): Target => ['document'],
  querySelector: (query: string): Target => ['querySelector', query]
} as const;
export const addEventListener = (target: Target, event: string, ) => {}
export const removeEventListener = (target: Target) => {}