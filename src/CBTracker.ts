
export const CBTracker = <TCallback>() => {
  const events = new Set<['once' | 'always', TCallback]>()
  const once = (...callbacks: TCallback[]) => {
    callbacks.forEach(callback => events.add(['once', callback]));
  }
  const add = (...callbacks: TCallback[]) => {
    callbacks.forEach(callback => events.add(['always', callback]));
  }
  return {
    once,
    add,
    *[Symbol.iterator](): Generator<TCallback, void, unknown> {
      for (const ev of events) {
        const [type, callback] = ev;
        if (type === 'once') {
          events.delete(ev)
        }
        yield callback
      }
    }
  }
}