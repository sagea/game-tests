import { timeDiffS, update, preframe, timeMS, removal, render } from './animate'
import { beginPath, fill, fillStyle, rect, restore, save } from './draw2'
import { addHitbox, attachHitboxToObject, checkHitboxes, createHitBox, getInteractionsForHitboxId, moveHitbox, removeHitbox } from './hitbox'
import { modify, lensPath, allPass, when, append, pipe, map, set, curry, reduce, dissoc, forEach, mergeLeft } from 'ramda'
import { Field, GO } from './State/GO'
import { initialStateHandler } from './stateUtils'
import { uid } from './uid'
import { filterValues, values, hasSymbol, isString, random, timeDifference, mapValues } from './util'
import { add, from, left, up, x, y } from './Vector'
import { SExtendValue, SFilterValues, SMapExtendValues, State, SValue } from './State/State'

const ACTIVE = 'ACTIVE';
const INACTIVE = 'INACTIVE'
const key = (custom) => `GAME/ENEMIES/${custom}`;
// export const enemies = GO(key('enemies'));

interface Enemy {
    id: string;
    pos: Vector;
    size: Vector;
    speed: number;
    health: number;
    originalHealth: number;
    hitboxId?: string;
    status: 'ACTIVE' | 'INACTIVE';
}
export const lastSpawnTime = State(0);
export const enemies = State<Record<string, Enemy>>({});

export const createEnemy = (posX: number): Enemy => ({
    id: uid(),
    pos: from(1800, posX),
    size: from(100, 50),
    speed: 350,
    health: 100,
    originalHealth: 100,
    hitboxId: null,
    status: ACTIVE,
})

const canCreate = allPass([
    () => (timeMS() - lastSpawnTime()) > 1000
])

const moveEnemies = () => {
    enemies(SMapExtendValues(enemy => ({
        pos: add(enemy.pos, left(enemy.speed * timeDiffS())),
    })))
    values(enemies())
        .forEach(enemy => {
            moveHitbox(enemy.hitboxId, enemy.pos)
        });
}

const isEnemyOnPage = ({ pos }) => x(pos) > 100

const canRemoveEnemy = (enemy) => {
    if(!isEnemyOnPage(enemy)) return true;
    if (enemy.health === 0) return true;
    return false;
}
const enemyRemover = () => {
    values(enemies())
        .forEach(enemy => {
            if (canRemoveEnemy(enemy)) {
                setEnemyInactive(enemy);
                removeHitbox(enemy.hitboxId);
            }
        })
}

export const spawnEnemies = () => {
    if (canCreate()) {
        const enemy = createEnemy(random(100, 900))
        const hitbox = createHitBox('enemies', enemy.pos, enemy.size, enemy.id)

        lastSpawnTime(timeMS());
        enemies(SValue(enemy.id, attachHitboxToObject(hitbox, enemy)))
        addHitbox(hitbox);
    }
}

const setEnemyInactive = (enemy: Enemy) => {
    return enemies(SExtendValue(enemy.id, { status: 'INACTIVE' }));
}
export const damageEnemy = (amount: number, enemy: Enemy) => {
    enemies(SExtendValue(enemy.id, (e) => ({
        health: Math.max(0, e.health - amount)
    })))
}


removal.add(
    () => enemies(SFilterValues(({ status }) => status !== 'INACTIVE'))
)
update.add(
    spawnEnemies,
    moveEnemies,
    enemyRemover,
);
render.add(() => {
    values(enemies()).forEach((enemy) => {
        if (enemy.status === INACTIVE) return [];
        const interactions = getInteractionsForHitboxId(enemy.hitboxId)
        const hasTouchedBullet = interactions.some(hitbox => hitbox.label === 'bullets')
        const healthPercentage = enemy.health / enemy.originalHealth;
        save()
        beginPath()
        fillStyle('red')
        rect(...add(enemy.pos, up(50)), ...y(enemy.size, 20))
        fill();
        restore()

        save()
        beginPath()
        fillStyle('green')
        rect(...add(enemy.pos, up(50)), ...from(x(enemy.size) * healthPercentage, 20))
        fill();
        restore()

        save()
        beginPath()
        fillStyle(hasTouchedBullet ? 'blue' : 'green')
        rect(...enemy.pos, ...enemy.size)
        fill();
        restore()
        // rect(enemy.pos, enemy.size, fillStyle(hasTouchedBullet ? 'blue' : 'green'))
        // rect(add(enemy.pos, up(50)), y(enemy.size, 20), fillStyle('red')),
        // rect(add(enemy.pos, up(50)), from(x(enemy.size) * healthPercentage, 20), fillStyle('green'))
        // rect(enemy.pos, enemy.size, fillStyle(hasTouchedBullet ? 'blue' : 'green')),
    })
})
// render.add((rs) => {
//     return handleRenders(
//         ...values(enemies()).flatMap((enemy) => {
//             if (enemy.status === INACTIVE) return [];

//             const interactions = getInteractionsForHitboxId(enemy.hitboxId)
//             const hasTouchedBullet = interactions.some(hitbox => hitbox.label === 'bullets')
//             const healthPercentage = enemy.health / enemy.originalHealth;
//             const hb = [
//                 rect(add(enemy.pos, up(50)), y(enemy.size, 20), fillStyle('red')),
//                 rect(add(enemy.pos, up(50)), from(x(enemy.size) * healthPercentage, 20), fillStyle('green'))
//             ];
//             return [
//                 ...hb,
//                 rect(enemy.pos, enemy.size, fillStyle(hasTouchedBullet ? 'blue' : 'green')),
//             ]
//         })
//     )(rs)
// })