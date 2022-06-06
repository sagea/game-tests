import { CBTracker } from './CBTracker.ts'
import { State } from './State/State.ts';
import { renderContext } from './draw.ts';
import { isFunction } from './utilities/generic.ts';

type FinalCallback = () => any;

export const $$initiate = CBTracker<() => any>()
export const inputs = CBTracker<() => any>()
export const preframe = CBTracker<() => any>()
export const physics = CBTracker<() => any>()
export const update = CBTracker<() => any>()
export const removal = CBTracker<() => any>();

export const prerender = CBTracker<(() => any) | [number, (() => any)]>()
export const render = CBTracker<(() => any) | [number, (() => any)]>()

export const final = CBTracker<FinalCallback>()

export const timeMS = State(0);
export const timeDiffMS = State(0);
export const timeS = State(0);
export const timeDiffS = State(0);
export const fps = State(0);
const calculateFpsFromDiff = (timeDiff) => Math.round(1 / timeDiff);

const attachTimes = (animateTimeMs) => {
  const lastTimeMs = timeMS();
  const diffTimeMs = animateTimeMs - lastTimeMs;
  timeMS(animateTimeMs);
  timeDiffMS(diffTimeMs);
  timeS(animateTimeMs / 1000);
  timeDiffS(diffTimeMs / 1000);
  fps(calculateFpsFromDiff(timeDiffS()))
}

const frame = (method) => {
  // return setTimeout(method, 200);
  return requestAnimationFrame(method)
}
export const sentTracker = new WeakSet();

export function activate(canvasWorker) {
  async function animate(t) {
    attachTimes(t)
    const stateMethods = [...$$initiate, ...inputs, ...preframe, ...physics, ...update]
    const endMethods = [...removal, ...final];

    stateMethods.forEach(callback => callback());
    const renderContext2 = renderContext(() => {
      const prerenderSorted = [...prerender]
        .map(item => isFunction(item) ? [0, item] as const: item)
        .sort((a, b) => a[0] - b[0]);
      const renderSorted = [...render]
      .map(item => isFunction(item) ? [0, item] as const: item)
      .sort((a, b) => a[0] - b[0]);
      [...prerenderSorted, ...renderSorted].forEach(([, callback]) => callback());
    })
    endMethods.forEach(callback => callback())
    await canvasWorker.newRenderer2(renderContext2);
    frame(animate)
  }
  frame(animate)

}