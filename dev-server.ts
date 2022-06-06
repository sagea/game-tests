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

router.get('/last-change', (ctx, next) => {
  ctx.response.status = 200;
  ctx.response.body = lastChanged;
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