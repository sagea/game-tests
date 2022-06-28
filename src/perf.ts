
const active = new Set<string>();
export const reset = () => {
  active.clear();
  // console.log(Array.from(performance.getEntries()))
  performance.clearMarks();
  performance.clearMeasures();
}

export const start = (item: string) => {
  active.add(item);
  performance.mark(`${item}:start`, { detail: 'perf.ts' });
}

export const end = (item: string) => {
  if (active.has(item)) {
    performance.mark(`${item}:end`, { detail: 'perf.ts' });
    performance.measure(item, `${item}:start`, `${item}:end`);
    active.delete(item)
  }
}

export const now = () => performance.now()
export const mark = (...args) => performance.mark(...args)
export const measure = (...args) => performance.measure(...args)
