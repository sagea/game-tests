import { assertEquals } from "https://deno.land/std@0.143.0/testing/asserts.ts";
import { createSpriteMatrix } from '../spriteMatrix.ts';
import { v } from '../../../Vector.ts';

Deno.test({
  name: 'modules/Sprite/spriteMatrix/createSpriteMatrix',
  async fn ({ step }) {
    await step('should create sprite matrix', () => {
      const res = createSpriteMatrix(3, 2);
      assertEquals(res, [
        [v(0, 0), v(1, 0)],
        [v(0, 1), v(1, 1)],
        [v(0, 2), v(1, 2)],
      ]);
    })
  }
});
