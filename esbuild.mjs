import { build } from 'esbuild'
import LiveServer from 'live-server';

/**  @type import('esbuild').ServeOptions */
const serveOptions = {
  servedir: 'build/',
  onRequest: (...args) => {
    console.log('args', args);
  }
}
/** @type import('esbuild').BuildOptions */
const buildOptions = {
  entryPoints: ['src/loader.ts', './src/canvas-worker.ts'],
  loader: { '.ts': 'ts' },
  treeShaking: true,
  outdir: 'build/src/',
  sourcemap: true,
  format: 'esm',
  bundle: true,
  watch: {
    onRebuild(error, result) {
      if (error) console.error('watch build failed:', error)
      else console.log('watch build succeeded:', result)
    },
  },
};
build(buildOptions);

LiveServer.start({
  port: 8888,
  root: 'build/',
  open: true,
})

// require('esbuild').build().then(result => {
//   console.log('watching...', result)
// })