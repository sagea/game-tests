export const Counter = () => {
  let number = 0;
  return () => number++;
}

export const globalCounter = Counter();