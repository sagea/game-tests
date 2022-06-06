import { physics, removal } from './animate.ts'
import { Component, query, creator } from './modules/ecs/mod.ts'
import { Vector } from './Vector.ts'
import { ComponentListStateManagers } from './modules/ecs/components.ts'

declare module './modules/ecs/mod.ts' {
  export interface ComponentList {
    Hitbox: Component<'Hitbox', {
      label: string;
      x: number;
      y: number;
      x2: number;
      y2: number;
      width: number;
      height: number;
      entityInteractions: number[];
    }>;
  }
}

export const Hitbox = creator('Hitbox');

export const createHitBoxComponent = (
  label: string,
  [x, y]: Vector,
  [width, height]: Vector,
) => {
  return Hitbox({
    label,
    x, y,
    x2: x + width,
    y2: y + height,
    width,
    height,
    entityInteractions: [],
  })
}
export const updateHitboxTransform = (
  Hitbox: ComponentListStateManagers['Hitbox'],
  [x, y]: Vector,
  [width, height]: Vector
) => {
  Hitbox({ x, y, x2: x + width, y2: y + height, width, height });
}
// export const
export const isLine = (hitbox) => hitbox.x === hitbox.x2 || hitbox.y === hitbox.y2
export const hittest = (hitboxA, hitboxB) => {
  if (isLine(hitboxA) || isLine(hitboxB)) return false
  if (hitboxB.x >= hitboxA.x2) return false
  if (hitboxA.x >= hitboxB.x2) return false
  if (hitboxB.y >= hitboxA.y2) return false
  if (hitboxA.y >= hitboxB.y2) return false
  return true
}

export const checkHitboxes = () => {
  const ht = [...query(['EntityId', 'Hitbox'])];
  for (let i = 0; i < ht.length; i++) {
    const a = ht[i];
    for (let j = i + 1; j < ht.length; j++) {
      const b = ht[j];
      const aHitbox = a.Hitbox();
      const bHitbox = b.Hitbox();
      if (hittest(aHitbox, bHitbox)) {
        const aid = a.EntityId().id;
        const bid = b.EntityId().id;
        a.Hitbox({
          entityInteractions: [...aHitbox.entityInteractions, bid],
        })
        b.Hitbox({
          entityInteractions: [...bHitbox.entityInteractions, aid],
        })
      }
    }
  }
}

export const clearHitboxInteractions = () => {
  for (let { Hitbox } of query(['Hitbox'])) {
    Hitbox({ entityInteractions: [] });
  }
}
removal.add(
  clearHitboxInteractions,
)

physics.add(checkHitboxes)
