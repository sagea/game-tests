import { inputs } from './animate'
import { State } from './State/State'
import { windowKeyDownListener, windowKeyUpListener } from './utilities/events';

const trackedKeys = State<Record<string, boolean>>({})
const frameSnapshotKeys = State<Record<string, boolean>>({});
const setKeyDown = code => {
    trackedKeys(keys => ({ ...keys, [code]: true }));
}

const setKeyUp = code => {
    trackedKeys(({ [code]: _, ...rest }) => (rest));
}

inputs.add(() => {
    frameSnapshotKeys(trackedKeys())
})

windowKeyDownListener
    .onValue(({ code }) => {
        setKeyDown(code)
    })

windowKeyUpListener
    .onValue(({ code }) => {
        setKeyUp(code)
    })

export const isKeyDown = keyString => Boolean(frameSnapshotKeys()[keyString])
