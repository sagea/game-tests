import { curry, pipe } from 'ramda';
import { isObject, flattenEnsurePipe, isArray } from '../util';

const GameStateSymbol = Symbol('GameState');
export interface GlobalState {
  isGlobalState: true;
}
export const isGlobalState = (state: any): state is GlobalState => {
  if (isObject(state) && state.isGlobalState) return true;
  if (isArray(state) && state[0] === 'isGlobalState') return true;
  return false;
}
export const createGlobalStateObject = (): GlobalState => ({ isGlobalState: true });
export const createGlobalStateArray = () => ['isGlobalState'];

export const mustReturnGlobalState = (methodOrMethodList) => {
  if (isArray(methodOrMethodList)) {
    return methodOrMethodList.map(mustReturnGlobalState);
  }
  return (...args) => {
    const result = methodOrMethodList(...args);
    if (!isGlobalState(result)) {
      throw new Error('Expected function to return global state')
    };
    return result;
  }
}

export const gsp = (...deepArgs) => (gs) => {
  if (!isGlobalState(gs)) throw new Error('gsp expected return function to be provided a global state type');
  const args = mustReturnGlobalState(flattenEnsurePipe(...deepArgs))
  return pipe(...args)(gs);
}

export const gsCurry = method => curry(mustReturnGlobalState(method));
