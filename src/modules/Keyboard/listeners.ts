import { isWorkerContext } from '../Workers/mod.ts';
import { clearKeys, triggerKeyDown, triggerKeyUp } from './KeyTracker.ts';
import type { NativeKeyCode } from './KeyCodes.ts';


export type KeyboardEvents = {
  'module:Keyboard:event:window:keydown': typeof triggerKeyDown;
  'module:Keyboard:event:window:keyup': typeof triggerKeyUp;
  'module:Keyboard:event:window:blur': typeof clearKeys;
}

export const attachListeners = (worker?: KeyboardEvents): KeyboardEvents => {
  if (!isWorkerContext()) {
    const keydownEvent = worker
      ? (event: Event & { code: string }) => worker['module:Keyboard:event:window:keydown'](event.code as NativeKeyCode)
      : triggerKeyDown;

    const keyUpEvent = worker
      ? (event: Event & { code: string }) => worker['module:Keyboard:event:window:keyup'](event.code as NativeKeyCode)
      : triggerKeyUp;

    const blurEvent = worker
      ? () => worker['module:Keyboard:event:window:blur']()
      : triggerKeyUp;
    window.addEventListener('keydown', keydownEvent as any);
    window.addEventListener('keyup', keyUpEvent as any);
    window.addEventListener('blur', blurEvent as any);
  }

  return {
    'module:Keyboard:event:window:keydown': triggerKeyDown,
    'module:Keyboard:event:window:keyup': triggerKeyUp,
    'module:Keyboard:event:window:blur': clearKeys,
  }
}
