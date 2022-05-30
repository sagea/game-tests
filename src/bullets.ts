import { removal, render, timeDiffS, timeMS, update } from './animate'
import { addHitbox, attachHitboxToObject, createHitBox, getInteractionsForHitboxId, moveHitbox, removeHitbox } from './hitbox'
import { isKeyDown } from './keys'
import { allPass, curry } from 'ramda'
import { uid } from './uid'
import { pos } from './user'
import { filterValues, mapValues, p, values } from './util'
import { add, from, right, Vector, x, y } from './Vector'
import { damageEnemy, enemies } from './enemy'
import { SExtendValue, SFilterValues, SMapExtendValues, State, StateImmer, SValue } from './State/State';
import { fill, fillStyle, restore, save, rect, beginPath } from './draw2'
import { castDraft } from 'immer'

interface Bullet {
    id: string;
    pos: Vector,
    size: Vector,
    direction: Vector,
    speed: number,
    hitboxId?: string,
    status: 'ACTIVE' | 'INACTIVE',
}

export const lastBulletFiredTime = State(0);
export const bullets = StateImmer<Map<string, Bullet>>(new Map());

const createBullet = (pos): Bullet => {
    return {
        id: uid(),
        pos,
        size: from(10),
        direction: from(0),
        speed: 700,
        hitboxId: null,
        status: 'ACTIVE'
    }
}

const calculateBulletSpeedForFrame = (bullet) => bullet.speed * timeDiffS()

const canCreateBullet = allPass([
    () => {
        return isKeyDown('Space')
    },
    () => (timeMS() - lastBulletFiredTime()) > 100,
])


const bulletCreator = () => {
    if (canCreateBullet()) {
        const userPosition = pos()  
        const bullet = createBullet(userPosition)
        const hitbox = createHitBox('bullets', bullet.pos, bullet.size, bullet.id)
        bullets(bullets => {
            bullets.set(bullet.id, attachHitboxToObject(hitbox, bullet))
        })
        lastBulletFiredTime(() => timeMS());
        addHitbox(hitbox)
    }
}

const isBulletOnPage = ({ pos }) => x(pos) < 1920;

const bulletUpdate = () => {
    bullets(bullets => {
        bullets.forEach((bullet) => {
            bullet.pos = add(bullet.pos, right(calculateBulletSpeedForFrame(bullet)));
        })
    })
    bullets().forEach(({ hitboxId, pos }) => {
        moveHitbox(hitboxId, pos)
    })
}

const bulletRemover = () => {
    bullets().forEach((bullet) => {
        const onPage = isBulletOnPage(bullet)
        const interactions = getInteractionsForHitboxId(bullet.hitboxId)
        const firstTouchedEnemyHitbox = interactions.find(hitbox => hitbox.label === 'enemies')
        const shouldRemove = !onPage || firstTouchedEnemyHitbox;
        if (shouldRemove) {
            setBulletInactive(bullet)
            removeHitbox(bullet.hitboxId)
        }
        if (firstTouchedEnemyHitbox) {
            damageEnemy(10, enemies()[firstTouchedEnemyHitbox.ownerId])
        }
    })
}

const setBulletInactive = ({ id }: Bullet) => {
    bullets(bullets => {
        bullets.get(id).status = 'INACTIVE';
    })
}

removal
    .add(
        () => bullets(bullets => {
            bullets.forEach((bullet, id) => {
                if (bullet.status === 'INACTIVE') {
                    bullets.delete(id);
                }
            })
        })
    )

update
    .add(
        bulletCreator,
        bulletUpdate,
        bulletRemover,
    )

const keyframes = () => {}

// type Color = [number, number, number, number];
// interface Rect {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
//     stroke: boolean;
//     strokeColor: Color;
//     strokeWidth: number;
//     fillColor: Color;
// }

render
    .add(() => {
        bullets().forEach(({ pos, size }) => {
            save()
            beginPath()
            rect(...pos, ...size)
            fillStyle('black')
            fill()
            restore()
        })
    })
