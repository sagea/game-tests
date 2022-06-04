import { Application, Router } from 'https://deno.land/x/oak@v10.6.0/mod.ts';

const app = new Application();
const port = 9999;

app.use(async (ctx) => {
  await ctx.send({
    root: `${Deno.cwd()}/build/`,
    index: 'index.html',
  })
})

app.addEventListener("listen", ({ hostname, port, serverType }) => {
  console.log(
    `Server listing on ${hostname}:${port}. using HTTP server: ${serverType}`
  );
});


app.listen({ hostname: '0.0.0.0', port });