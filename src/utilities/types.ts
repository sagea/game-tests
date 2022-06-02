export type NormalizeUnion<T> = T extends infer U ? { [K in keyof U]: U[K] } : never
