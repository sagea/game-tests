import { Bus } from 'baconjs'

export const windowKeyDownListener = new Bus<{ code: string }>();
export const windowKeyUpListener = new Bus<{ code: string }>();
