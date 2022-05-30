import { fromEvent } from 'baconjs'
import { inputs } from './animate'
import { State } from './State/State'

const trackedKeys = State<Record<string, boolean>>({})
const frameSnapshotKeys = State<Record<string, boolean>>({});

const setKeyDown = code => {
    trackedKeys(keys => ({ ...keys, [code]: true }));
}
const setKeyUp = code => {
    trackedKeys(({ [code]: _, ...rest }) => (rest));
}

inputs.add(
    gs => {
        frameSnapshotKeys(trackedKeys())
        return gs
    }
)
fromEvent(window, 'keydown')
    .onValue(({ code }) => {
        setKeyDown(code)
    })

fromEvent(window, 'keyup')
    .onValue(({ code }) => {
        setKeyUp(code)
    })

export const isKeyDown = keyString => Boolean(frameSnapshotKeys()[keyString])
