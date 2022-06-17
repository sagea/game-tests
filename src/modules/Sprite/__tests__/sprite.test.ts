import { assertObjectMatch, assertEquals } from "https://deno.land/std@0.143.0/testing/asserts.ts";
import { Sprite, spritePoll, spriteSetRow } from '../sprite.ts';
import { createSpriteMatrix } from '../spriteMatrix.ts'

Deno.test({
  name: 'modules/Sprite/sprite/spritePoll',
  async fn ({ step }) {
    await step('activates sprite if inactive', () => {
      const sprite = Object.freeze(Sprite({
        active: false,
        matrix: createSpriteMatrix(4, 4),
        activeCol: 0,
        activeRow: 0,
        lastTime: 0,
        interval: 200,
      }));
      assertObjectMatch(spriteSetRow(sprite, 0), {
        active: true,
        activeRow: 0,
        activeCol: 0,
      });
    })
    await step('does nothing if provided row is the same', () => {
      const sprite = Object.freeze(Sprite({
        active: true,
        matrix: createSpriteMatrix(4, 4),
        activeCol: 0,
        activeRow: 0,
        lastTime: 0,
        interval: 200,
      }));

      assertEquals(spriteSetRow(sprite, 0), sprite);
    })
    await step('resets the sprite if provided row is different', () => {
      const sprite = Object.freeze(Sprite({
        active: true,
        matrix: createSpriteMatrix(4, 4),
        activeCol: 3,
        activeRow: 2,
        lastTime: 50,
        interval: 200,
      }));

      assertObjectMatch(spriteSetRow(sprite, 1), {
        activeCol: 0,
        activeRow: 1,
        lastTime: 0,
      });
    })
  }
})
Deno.test({
  name: 'modules/Sprite/Sprite/spritePoll',
  async fn ({ step }) {
    await step('should do nothing if sprite is not active', () => {
      const sprite = Object.freeze(Sprite({
        active: false,
        matrix: createSpriteMatrix(4, 4),
        activeCol: 0,
        activeRow: 0,
        lastTime: 0,
        interval: 200,
      }));
      assertEquals(spritePoll(sprite, 110), sprite);
    })
    await step('should update sprite col on interval change', () => {
      const sprite = Object.freeze(Sprite({
        active: true,
        matrix: createSpriteMatrix(4, 4),
        activeCol: 0,
        activeRow: 0,
        lastTime: 0,
        interval: 200,
      }));
      assertObjectMatch(spritePoll(sprite, 150), { activeCol: 0, lastTime: 150 })
      assertObjectMatch(spritePoll(sprite, 201), { activeCol: 1, lastTime: 1 })
      assertObjectMatch(spritePoll(sprite, 450), { activeCol: 2, lastTime: 50 })
      assertObjectMatch(spritePoll(sprite, 650), { activeCol: 3, lastTime: 50 })
      assertObjectMatch(spritePoll(sprite, 750), { activeCol: 3, lastTime: 150 })
      assertObjectMatch(spritePoll(sprite, 801), { activeCol: 0, lastTime: 1 })
    });
  }
});