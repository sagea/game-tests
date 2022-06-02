import { inputs } from './animate'
import { State } from './State/State'
import { windowKeyDownListener, windowKeyUpListener, windowBlurListener } from './utilities/events';

const trackedKeys = State<Record<string, boolean>>({})
const frameSnapshotKeys = State<Record<string, boolean>>({});
const removeAllDownKeys = () => {
  trackedKeys({});
}
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

windowBlurListener
  .onValue(() => {
    removeAllDownKeys();
  });

export const isKeyDown = keyString => Boolean(frameSnapshotKeys()[keyString])
