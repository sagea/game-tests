import { Component, query, ComponentInstanceEditor, EntityId } from './modules/ecs/mod.ts'
import { Vector } from './Vector.ts'
import { AppPlugin } from './modules/ecs/mod.ts';

export type HitboxDimensions = {
  x: number;
  y: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
}
export const Hitbox = Component<{
  label: string;
  entityInteractions: number[];
} & HitboxDimensions>();

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
  hitbox: ComponentInstanceEditor<typeof Hitbox>,
  [x, y]: Vector,
  [width, height]: Vector
) => {
  hitbox({ x, y, x2: x + width, y2: y + height, width, height });
}
// export const
export const isLine = (hitbox: HitboxDimensions) => hitbox.x === hitbox.x2 || hitbox.y === hitbox.y2
export const hittest = (hitboxA: HitboxDimensions, hitboxB: HitboxDimensions) => {
  if (isLine(hitboxA) || isLine(hitboxB)) return false
  if (hitboxB.x >= hitboxA.x2) return false
  if (hitboxA.x >= hitboxB.x2) return false
  if (hitboxB.y >= hitboxA.y2) return false
  if (hitboxA.y >= hitboxB.y2) return false
  return true
}

export const checkHitboxes = () => {
  const ht = [...query({ entityId: EntityId, hitbox: Hitbox })];
  for (let i = 0; i < ht.length; i++) {
    const a = ht[i];
    for (let j = i + 1; j < ht.length; j++) {
      const b = ht[j];
      const aHitbox = a.hitbox();
      const bHitbox = b.hitbox();
      if (hittest(aHitbox, bHitbox)) {
        const aid = a.entityId().id;
        const bid = b.entityId().id;
        a.hitbox({
          entityInteractions: [...aHitbox.entityInteractions, bid],
        })
        b.hitbox({
          entityInteractions: [...bHitbox.entityInteractions, aid],
        })
      }
    }
  }
}

export const clearHitboxInteractions = () => {
  for (const { hitbox } of query({ hitbox: Hitbox })) {
    hitbox({ entityInteractions: [] });
  }
}

export const hitboxPlugin: AppPlugin = (app) => {
  app
    .addSystem(clearHitboxInteractions)
    .addSystem(checkHitboxes);
}
