import { renderState } from './draw'
import { fromEvent } from 'baconjs'
import { drawHandlers, executeOnCanvas } from './draw2'

const messageEvent = fromEvent(self, 'message')
const onGameMessage = messageEvent
    .map(e => e?.data)
    .filter(Boolean)

const onCanvasMessage = onGameMessage
    .filter(e => e.type === 'canvas')
    .map(({ canvas }) => canvas.getContext('2d'))

const onNewRenderMessage = onGameMessage
    .filter(e => e.type === 'NewRenderer')

const onNewRenderMessage2 = onGameMessage
    .filter(e => e.type === 'NewRenderer2')

onCanvasMessage
    .flatMap((ctx) =>
        onNewRenderMessage
            .map(message => [ctx, message])
    )
    .onValue(([ctx, { handlers }]) => {
        renderState(ctx, handlers)
    })

onCanvasMessage
    .flatMap((ctx) =>
        onNewRenderMessage2
            .map(message => [ctx, message])
    )
    .onValue(([ctx, { handlers }]) => {
        for (let handler of handlers) {
            executeOnCanvas(ctx, handler);
        }
    })
