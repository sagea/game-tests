import { isFunction } from '../../utilities/generic.ts';

export const State = <T>(initialState: T) => {
  let internalState: T = initialState;
  return (handler?: T | ((internalState: T) => T)) => {
    if (handler) {
      internalState = isFunction(handler) ? handler(internalState) : handler;
    }
    return internalState;
  }
}
