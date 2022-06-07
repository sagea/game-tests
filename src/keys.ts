import { inputs, final } from './animate.ts'
// import { State } from './modules/State/mod.ts'
// import { windowKeyDownListener, windowKeyUpListener, windowBlurListener } from './utilities/events.ts';
import { applySnapshot } from './modules/Keyboard/mod.ts'

// const trackedKeys = State<Record<string, boolean>>({});
// const trackedJustPressed = State<Record<string, boolean>>({});
// const frameSnapshotKeys = State<Record<string, boolean>>({});

// const removeAllDownKeys = () => {
//   trackedKeys({});
// }
// const setKeyDown = (code: string) => {
//   trackedJustPressed(keys => ({ ...keys, [code]: true }));
//   trackedKeys(keys => ({ ...keys, [code]: true }));
// }

// const setKeyUp = (code: string) => {
//   trackedKeys(({ [code]: _, ...rest }) => (rest));
// }
inputs.add(() => {
  applySnapshot();
})
// final.add(() => {
//   trackedJustPressed({});
// })
// windowKeyDownListener
//   .onValue(({ code }: { code: string }) => {
//     setKeyDown(code)
//   })

// windowKeyUpListener
//   .onValue(({ code }: { code: string }) => {
//     setKeyUp(code)
//   })

// windowBlurListener
//   .onValue(() => {
//     removeAllDownKeys();
//   });

// export const isKeyDown = (keyString: string): boolean => Boolean(frameSnapshotKeys()[keyString])
// export const justPressed = (keyString: string): boolean => Boolean(trackedJustPressed()[keyString]);
