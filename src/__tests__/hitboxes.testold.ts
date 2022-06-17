jest.mock('../uid')
const load =
  <T>(importMethod: () => T): (() => T) =>
    async () => {
      const r: any = await importMethod()
      return r.default
    }
const mhitbox = load(() => import('../hitbox'))
const muid = load(async () => jest.mocked(await import('../uid')))

afterEach(() => {
  jest.resetModules()
})

describe('checkHitboxes', () => {
  test('should add hitbox interactions', async () => {
    const {
      hitboxes,
      hitboxInteractions,
      checkHitboxes,
      addHitbox,
      createHitBox,
      getInteractionsForHitboxId,
    } = await mhitbox()
    const { uid } = await muid()
    uid.mockReturnValueOnce('------')
    uid.mockReturnValueOnce('++++++')
    const hitboxA = createHitBox('f', [50, 50], [100, 100], 'woah')
    const hitboxB = createHitBox('b', [60, 60], [80, 80], 'woah2')
    addHitbox(hitboxA, hitboxB)
    expect(hitboxes()).toMatchInlineSnapshot(`
            Object {
              "++++++": Object {
                "height": 80,
                "id": "++++++",
                "label": "b",
                "ownerId": "woah2",
                "width": 80,
                "x": 60,
                "x2": 140,
                "y": 60,
                "y2": 140,
              },
              "------": Object {
                "height": 100,
                "id": "------",
                "label": "f",
                "ownerId": "woah",
                "width": 100,
                "x": 50,
                "x2": 150,
                "y": 50,
                "y2": 150,
              },
            }
        `)
    expect(hitboxInteractions()).toMatchInlineSnapshot(`
            Object {
              "++++++": Array [],
              "------": Array [],
            }
        `)
    checkHitboxes({})
    expect(hitboxInteractions()).toMatchInlineSnapshot(`
            Object {
              "++++++": Array [
                "------",
              ],
              "------": Array [
                "++++++",
              ],
            }
        `)
    expect(getInteractionsForHitboxId('------')).toMatchInlineSnapshot(`
            Array [
              Object {
                "height": 80,
                "id": "++++++",
                "label": "b",
                "ownerId": "woah2",
                "width": 80,
                "x": 60,
                "x2": 140,
                "y": 60,
                "y2": 140,
              },
            ]
        `)
    expect(getInteractionsForHitboxId('++++++')).toMatchInlineSnapshot(`
            Array [
              Object {
                "height": 100,
                "id": "------",
                "label": "f",
                "ownerId": "woah",
                "width": 100,
                "x": 50,
                "x2": 150,
                "y": 50,
                "y2": 150,
              },
            ]
        `)
  })
})
