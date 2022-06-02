export function* Counter(starting: number = 0): Generator<number, null, unknown> {
  let current = starting;
  while(true) {
    yield current++;
  }
}