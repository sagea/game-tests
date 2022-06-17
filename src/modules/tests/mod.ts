export const all = async <T>(items: T[], cb: (item: T) => Promise<any>) => {
  const promises = items.map((item) => cb(item));
  return await Promise.all(promises);
}

type SC = Deno.TestContext & {
  all: <T>(list: T[], str: string, cb: (item: T, t: SC) => Promise<any>) => Promise<any>
}
export const s = (cb: (t: SC) => Promise<any>) => async (t: Deno.TestContext) => {
  const popts = {
    sanitizeOps: false,
    sanitizeResources: false,
    sanitizeExit: false,
  }
  const all: SC['all'] = async (list, str, cb) => {
    await Promise.all(list.map(async (item) => {
      const t = str.replace(/(%[a-zA-Z0-9]+)/g, (og, key) => {
        if (item.hasOwnProperty(key))
      })
    }))
    
  }
  const item = Object.assign(t, { all });
  await cb(item)
}