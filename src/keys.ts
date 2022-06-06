import { inputs } from './animate.ts'
import { State } from './State/State.ts'
import { windowKeyDownListener, windowKeyUpListener, windowBlurListener } from './utilities/events.ts';

const trackedKeys = State<Record<string, boolean>>({})
const frameSnapshotKeys = State<Record<string, boolean>>({});
const removeAllDownKeys = () => {
  trackedKeys({});
}
const setKeyDown = (code: string) => {
  trackedKeys(keys => ({ ...keys, [code]: true }));
}

const setKeyUp = (code: string) => {
  trackedKeys(({ [code]: _, ...rest }) => (rest));
}

inputs.add(() => {
  frameSnapshotKeys(trackedKeys())
})

windowKeyDownListener
  .onValue(({ code }: { code: string }) => {
    setKeyDown(code)
  })

windowKeyUpListener
  .onValue(({ code }: { code: string }) => {
    setKeyUp(code)
  })

windowBlurListener
  .onValue(() => {
    removeAllDownKeys();
  });

export const isKeyDown = (keyString: string) => Boolean(frameSnapshotKeys()[keyString])
