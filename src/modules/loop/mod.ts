import { AppPlugin } from '../ecs/mod.ts';
import { State } from '../State/mod.ts';

export const timeMS = State(0);
export const timeDiffMS = State(0);
export const timeS = State(0);
export const timeDiffS = State(0);
export const fps = State(0);
const calculateFpsFromDiff = (timeDiff: number) => Math.round(1 / timeDiff);

const attachTimes = (animateTimeMs: number) => {
  const lastTimeMs = timeMS();
  const diffTimeMs = animateTimeMs - lastTimeMs;
  timeMS(animateTimeMs);
  timeDiffMS(diffTimeMs);
  timeS(animateTimeMs / 1000);
  timeDiffS(diffTimeMs / 1000);
  fps(calculateFpsFromDiff(timeDiffS()))
}


export const LoopPlugin: AppPlugin = (app) => {
  app.addListener('postrun', () => {
    requestAnimationFrame(time => {
      attachTimes(time);
      app.run();
    })
  })
}
