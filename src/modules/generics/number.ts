export const isNumber = (item: unknown): item is number => typeof item === 'number' && isNaN(item) === false;

export function* range (a: number, b?: number) {
  const hasB = isNumber(b);
  const start = hasB ? a : 0;
  const end = hasB ? b : a;
  if (start > end) throw new Error('range start is larger than end');
  for (let i = start; i < end; i++) {
    yield i;
  }
}
