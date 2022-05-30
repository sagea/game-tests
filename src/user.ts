import { render, timeDiffS, update } from './animate'
import { isKeyDown } from './keys'
import { add, down, from, left, right, up, zero } from './Vector'
import { State } from './State/State'
import { fill, fillStyle, restore, save, rect, beginPath, closePath } from './draw'

export const pos = State(zero())
export const size = State(from(50))
export const speed = State(400);

const calculateSpeedForFrame = (): number => speed() * timeDiffS();

const moveUp = () => {
    if (isKeyDown('KeyW')) {
        pos(pos => add(pos, up(calculateSpeedForFrame())))
    }
}
const moveDown = () => {
    if (isKeyDown('KeyS')) {
        pos(pos => add(pos, down(calculateSpeedForFrame())))
    }
}

const moveLeft = () => {
    if (isKeyDown('KeyA')) {
        pos(pos => add(pos, left(calculateSpeedForFrame())))
    }
}

const moveRight = () => {
    if (isKeyDown('KeyD')) {
        pos(pos => add(pos, right(calculateSpeedForFrame())))
    }
}

update.add(
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
)

render.add(() => {
    save()
    beginPath()
    rect(...pos(), ...size())
    fillStyle('black')
    fill()
    closePath();
    restore()
})

