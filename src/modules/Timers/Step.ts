export const Step = (duration: number) => {
  let last = 0;
  return (deltaTime: number): boolean => {
    last = last + deltaTime;
    if (last > duration) {
      const leftover = last - duration;
      last = leftover;
      return true;
    }
    return false;
  }
};
