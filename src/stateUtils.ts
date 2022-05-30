import { complement, has, lensProp, set, when} from 'ramda'
export const initialStateHandler = (key, initialValue) => when(complement(has(key)), set(lensProp(key), initialValue))
