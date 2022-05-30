import { physics, removal, render } from './animate'
import { values } from 'ramda'
import { uid } from './uid'
import { SExtend, SExtendValue, SFilterValues, State } from './State/State'
import { beginPath, closePath, moveTo, restore, save, stroke, lineTo, strokeStyle, } from './draw'

export interface Hitbox {
    label: string;
    id: string;
    x: number;
    y: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
    ownerId: string;
}
export const createHitBox = (
    label: string,
    [x, y]: Vector,
    [width, height]: Vector,
    ownerId: string,
): Hitbox => {
    return {
        label,
        id: uid(),
        x,
        y,
        x2: x + width,
        y2: y + height,
        width,
        height,
        ownerId
    }
}

export const hitboxes = State<Record<string, Hitbox>>({});
export const hitboxInteractions = State<Record<string, string[]>>({})
export const hitboxRemoveQueue = State<string[]>([]);

export const attachHitboxToObject = <T extends { hitboxId?: string }>(hitbox: Hitbox, obj: T): T => ({ ...obj, hitboxId: hitbox.id })

export const isLine = (hitbox) => hitbox.x === hitbox.x2 || hitbox.y === hitbox.y2
export const hittest = (hitboxA, hitboxB) => {
    if (isLine(hitboxA) || isLine(hitboxB)) return false
    if (hitboxB.x >= hitboxA.x2) return false
    if (hitboxA.x >= hitboxB.x2) return false
    if (hitboxB.y >= hitboxA.y2) return false
    if (hitboxA.y >= hitboxB.y2) return false
    return true
}

export const getInteractionsForHitboxId = hitboxId => {
    return (hitboxInteractions()[hitboxId] || [])
        .map(hitboxId => hitboxes()[hitboxId])
}

export const removeHitbox = (hitboxId) => {
    hitboxRemoveQueue((queue) => [...queue, hitboxId]);
}

export const addInteraction = ({ id: idA }: Hitbox, { id: idB }: Hitbox) => {
    hitboxInteractions(SExtend((interactions) => ({
        [idA]: [...(interactions[idA] || []), idB],
        [idB]: [...(interactions[idB] || []), idA],
    })))
}

export const checkHitboxes = () => {
    const ht = values(hitboxes());
    for (let i = 0; i < ht.length; i++) {
        const hitboxA = ht[i];
        for (let j = i + 1; j < ht.length; j++) {
            const hitboxB = ht[j];
            if (hittest(hitboxA, hitboxB)) {
                addInteraction(hitboxA, hitboxB)
            }
        }
    }
}

export const getInteractions = (hitboxId) => {
    return hitboxInteractions()[hitboxId] || []
}

export const addHitbox = (...hitboxesToAdd: Hitbox[]) => {
    hitboxesToAdd.forEach(hitbox => {
        hitboxes((hitboxes) => ({ ...hitboxes, [hitbox.id]: hitbox }));
        hitboxInteractions((interactions) => ({ ...interactions, [hitbox.id]: [] }));
    })
}
export const moveHitbox = (hitboxId: string, [x, y]: Vector) => {
    hitboxes(SExtendValue(hitboxId, (hitbox) => {
        return {
            x,
            y,
            x2: x + hitbox.width,
            y2: y + hitbox.height,
        }
    }))
}

export const clearHitboxInteractions = () => hitboxInteractions({})
export const clearHitboxRemoveQueue = () => hitboxRemoveQueue([])
export const flushHitboxRemoveQueue = () => {
    hitboxes(SFilterValues((_, hitboxId) => {
        return !hitboxRemoveQueue().includes(hitboxId)    
    }))
}

removal.add(
    clearHitboxInteractions,
    flushHitboxRemoveQueue,
    clearHitboxRemoveQueue,
)

physics.add(checkHitboxes)

render.add(() => {
    values(hitboxes()).forEach(({ x, x2, y, y2}) => {
        save()
        beginPath()
        moveTo(x, y)
        lineTo(x2, y)
        lineTo(x2, y2)
        lineTo(x, y2)
        strokeStyle('blue')
        closePath()
        stroke()
        restore()
    })
})
