import { build, BuildOptions, BuildFailure, BuildResult } from 'https://deno.land/x/esbuild@v0.14.42/mod.js';
import { cache } from 'https://deno.land/x/esbuild_plugin_cache/mod.ts'
import importMap from './import_maps.json' assert { type: 'json' };

const watchFlag = Deno.args.includes('--watch') || Deno.args.includes('-w');
// const copyFile = async (from: string, to: string, { watch = false }: { watch?: boolean } = {}) => {
//   if (watch) {
//     const watcher = Deno.watchFs("./index_template.html");
//     let interval;
//     for await (const event of watcher) {
//       clearInterval(interval);
//       interval = setInterval(() => {
//         copyFile(from, to);
//       }, 50);
//       console.log(">>>> event", event);
//       // Example event: { kind: "create", paths: [ "/home/alice/deno/foo.txt" ] }
//     }
//   } else {
//     const fileExists = Boolean(await Deno.stat(from).catch(_ => undefined));
//     if (fileExists) {
//       await Deno.copyFile(from, to);
//     }
//   }
  
// }

// const baseBuildOptions: BuildOptions = {
//   entryPoints: ['src/loader.ts', './src/canvas-worker.ts', './src/app-worker.ts'],
//   loader: { '.ts': 'ts' },
//   treeShaking: true,
//   outdir: 'build/src/',
//   sourcemap: true,
//   format: 'esm',
//   bundle: true,
//   watch: false,
//   plugins: [cache({ importmap: importMap, directory: './.cache' }) as any]
// };

// if (watchFlag) {
//   baseBuildOptions.watch = {
//     onRebuild: (error, result) => {
//       if (error) console.error('watch build failed:', error)
//       else console.log('watch build succeeded:', result)
//     },
//   };
// }

// build(baseBuildOptions)
//   .then(result => console.log('result', result))
//   .catch(error => console.log(error));

// copyFile('./index_template.html', './build/index.html', { watch: watchFlag });

console.log(getDenoCacheDirectory())
async function getDenoCacheDirectory() {
  const p = Deno.run({ cmd: ['deno', 'info'], stdout: 'piped' });
  await p.status();
  const info = new TextDecoder().decode(await p.output());
  const result = info
    .trim()
    .split('\n')
    .map(row => row.trim())
    .find(row => row.includes('DENO_DIR'))
  if (!result) throw new Error('Can`t find deno cache');
  
}