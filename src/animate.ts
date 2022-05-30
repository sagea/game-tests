import { CBTracker } from './CBTracker'
import { State } from './State/State';
import { renderContext } from './draw';


type FinalCallback = () => any;

export const $$initiate = CBTracker<() => any>('$$initiate2')
export const inputs = CBTracker<() => any>('inputs2')
export const preframe = CBTracker<() => any>('preframe2')
export const physics = CBTracker<() => any>('physics2')
export const update = CBTracker<() => any>('update2')
export const removal = CBTracker<() => any>('removal2');

export const prerender = CBTracker<() => any>('prerender')
export const render = CBTracker<() => any>('render')

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

export const sentTracker = new WeakSet();
export function activate(canvasWorker) {
    function animate(t) {
        attachTimes(t)
        const stateMethods = [...$$initiate, ...inputs, ...preframe, ...physics, ...update ]
        const renderMethods = [...prerender, ...render ]
        const endMethods = [ ...removal, ...final ];

        stateMethods.forEach(callback => callback());
        const renderContext2 = renderContext(() => {
            renderMethods.forEach(callback => callback())
        })
        endMethods.forEach(callback => callback())
        canvasWorker.newRenderer2(renderContext2);
        frame(animate)
    }
    frame(animate)

}