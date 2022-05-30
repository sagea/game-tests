import { GlobalState } from './GlobalState';

export type GameState = GlobalState;
export type GameStateCallback = (gameState: GameState) => GameState;
type Falsy = null | undefined | '' | false | 0;
export const gsp = (...deepArgs: Array<Falsy | GameStateCallback>) => (gs: GlobalState): GlobalState => {
  return deepArgs
    .filter((item): item is GameStateCallback => Boolean(item))
    .reduce((res, b) => b(res), gs);
}
