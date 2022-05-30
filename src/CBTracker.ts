
export const CBTracker = <TCallback>(labelName: string) => {
    const events = new Set<['once' | 'always', TCallback]>()
    let eventId = -1;
    const once = (...callbacks: TCallback[]) => {
        callbacks.forEach(callback => events.add(['once', callback]));
    }
    const add = (...callbacks: TCallback[]) => {
        callbacks.forEach(callback => events.add(['always', callback]));
    }
    return {
        once,
        add,
        * [Symbol.iterator]() {
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