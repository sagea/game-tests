import { NativeKeyCode } from './KeyCodes.ts';

const activeKeys = new Set<NativeKeyCode>();
const justActivated = new Set<NativeKeyCode>();

let activeKeysSnapshot = new Set<NativeKeyCode>();
let justActivatedSnapshot = new Set<NativeKeyCode>();

export const keyDown = (codes: NativeKeyCode | NativeKeyCode[]): boolean => {
  if (Array.isArray(codes)) {
    return codes.some(code => justPressed(code));
  }
  return activeKeysSnapshot.has(codes);
};

export const justPressed = (codes: NativeKeyCode | NativeKeyCode[]): boolean => {
  if (Array.isArray(codes)) {
    return codes.some(code => justPressed(code));
  }
  return justActivatedSnapshot.has(codes);
}

export const triggerKeyDown = (keyCode: NativeKeyCode) => {
  const alreadyDown = activeKeys.has(keyCode);
  activeKeys.add(keyCode);
  if (!alreadyDown) {
    justActivated.add(keyCode);
  }
}

export const triggerKeyUp = (keyCode: NativeKeyCode) => {
  activeKeys.delete(keyCode);
}

export const clearKeys = () => {
  activeKeys.clear();
  activeKeysSnapshot.clear();

  justActivated.clear();
  justActivatedSnapshot.clear();
}

export const applySnapshot = () => {
  activeKeysSnapshot = new Set(activeKeys);
  justActivatedSnapshot = new Set(justActivated);
  justActivated.clear();
}
