import { CBTracker } from './CBTracker'
import { State } from './State/State';
import { renderContext } from './draw';
import { isFunction } from './utilities/generic';

type FinalCallback = () => any;

export const $$initiate = CBTracker<() => any>('$$initiate2')
export const inputs = CBTracker<() => any>('inputs2')
export const preframe = CBTracker<() => any>('preframe2')
export const physics = CBTracker<() => any>('physics2')
export const update = CBTracker<() => any>('update2')
export const removal = CBTracker<() => any>('removal2');

export const prerender = CBTracker<(() => any) | [number, (() => any)]>('prerender')
export const render = CBTracker<(() => any) | [number, (() => any)]>('render')

export const final = CBTracker<FinalCallback>('final')

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
class Perf {
  label: string;
  enabled: boolean;
  running: boolean = false;
  times: {label: string, time: number}[];
  startingTime: number;
  constructor(label: string, enabled: boolean = true) {
    this.label = label;
    this.enabled = enabled
  }
  reset() {
    this.running = false;
    this.times = [];
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.reset();
    return this;
  }
  logTime(smallLabel: string) {
    const currentTime = performance.now();
    const firstTime = this.times.length === 0 ? 0 : this.times[0].time;
    this.times.push({ label: smallLabel, time: currentTime })
    console.log(this.label, ':', smallLabel, currentTime - firstTime);
    return this;
  }
  start() {
    if (!this.enabled) return this;
    if (this.running) {
      this.reset();
      console.warn(`Perf with name "${this.label}" already found.`)
    }
    this.running = true;
    return this.logTime('start')
  }
  log(detail: string) {
    if (!this.enabled) return this;
    return this.logTime(detail);
  }
  calculateMetrics() {
    const firstTime = this.times[0];
    const lastTime = this.times[this.times.length - 1];
    const totalTime = lastTime.time - firstTime.time;
    console.log(`Results:`)
    console.log(`totalTime: ${totalTime}`);
    for (let i = 1; i < this.times.length - 1; i++) {
      let last = this.times[i - 1];
      const current = this.times[i];
      const delta = current.time - last.time;
      const perfentage = ((delta / totalTime) * 100).toFixed(2);
      console.log(`${current.label} Delta(${delta}) Percentage (${perfentage})`)
    }
  }
  end() {
    if (!this.enabled) return this;
    this.logTime('end');
    this.calculateMetrics();
    this.reset();
    return this;
  }
}
export const sentTracker = new WeakSet();
const perf = new Perf('Animate');
export function activate(canvasWorker) {
  async function animate(t) {
    attachTimes(t)
    const stateMethods = [...$$initiate, ...inputs, ...preframe, ...physics, ...update]
    const endMethods = [...removal, ...final];

    perf
      .setEnabled(false)
      .start()
    stateMethods.forEach(callback => callback());
    perf.log('update()')
    const renderContext2 = renderContext(() => {
      const prerenderSorted = [...prerender]
        .map(item => isFunction(item) ? [0, item] as const: item)
        .sort((a, b) => a[0] - b[0]);
      const renderSorted = [...render]
      .map(item => isFunction(item) ? [0, item] as const: item)
      .sort((a, b) => a[0] - b[0]);
      [...prerenderSorted, ...renderSorted].forEach(([, callback]) => callback());
    })
    perf.log('render()');
    endMethods.forEach(callback => callback())
    await canvasWorker.newRenderer2(renderContext2);
    perf.log('canvas render complete')
    perf.end()
    frame(animate)
  }
  frame(animate)

}