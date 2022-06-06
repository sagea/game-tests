import { Application, Router } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

const app = new Application();
const router = new Router();
const port = 9999;

let lastChanged = Date.now();
const rootPath = `${Deno.cwd()}/build/`;
const fileWatcher = async () => {
  for await (const _ of Deno.watchFs(rootPath)) {
    lastChanged = Date.now();
  }
}
router.get('/live-reload', (ctx) => {
  const content = `
    const sleep = (timer) => new Promise(resolve => setTimeout(resolve, timer));
    const check = async (loadedTime) => {
      try {
        const pre = await fetch('/live-reload', { method: 'post', body: loadedTime });
        return await pre.json();
      } catch (err) {
        console.log('Error checking livereload', err);
      }
    }
    const main = async () => {
      const loadedTime = Date.now();
      while(true) {
        await sleep(500);
        const res = await check(loadedTime)
        if (res && res.hasChanged) { location.reload(); }
      }
    }
    main();
  `
  ctx.response.status = 200;
  ctx.response.headers.append('Content-Type', 'application/javascript');
  ctx.response.body = content;
})
router.post('/live-reload', async (ctx, next) => {
  const body = ctx.request.body({ type: 'text' });
  const changed = Number(await body.value);
  
  ctx.response.status = 200;
  ctx.response.headers.append('Content-Type', 'application/json')
  ctx.response.body = { hasChanged: lastChanged > changed };
});

app.use(router.allowedMethods())
app.use(router.routes())

app.use(async (ctx) => {
  await ctx.send({
    root: rootPath,
    index: 'index.html',
  })
})

app.addEventListener("listen", ({ hostname, port, serverType }) => {
  console.log(
    `Server listing on ${hostname}:${port}. using HTTP server: ${serverType}`
  );
});

fileWatcher();
app.listen({ hostname: '0.0.0.0', port });