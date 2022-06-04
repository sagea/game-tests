#!/usr/bin/env -S deno run --no-check --allow-run --allow-read
import { command, pre, runCommand } from 'https://raw.githubusercontent.com/sagea/deno-utilities/main/command-runners.ts';

pre('build', 'build:watch') `
  rm -rf build/
  mkdir build/
  mkdir build/src/
`

command('build') `
echo "starting build"
(
  trap 'kill 0' SIGINT;
  deno bundle --import-map=import_maps.json --no-check src/loader.ts build/src/loader.js &
  deno bundle --import-map=import_maps.json --no-check ./src/app-worker.ts build/src/app-worker.js &
  deno bundle --import-map=import_maps.json --no-check ./src/canvas-worker.ts build/src/canvas-worker.js &
  cp index_template.html ./build/index.html
)
`;

command('build:watch') `
(
  trap 'kill 0' SIGINT;
  deno bundle --watch --import-map=import_maps.json --no-check src/loader.ts build/src/loader.js &
  deno bundle --watch --import-map=import_maps.json --no-check ./src/app-worker.ts build/src/app-worker.js &
  deno bundle --watch --import-map=import_maps.json --no-check ./src/canvas-worker.ts build/src/canvas-worker.js &
  cp index_template.html ./build/index.html
)
`;

command('dev') `
(
  trap 'kill 0' SIGINT;
  ./scripts.ts build:watch &
  deno run --allow-net --allow-read ./dev-server.ts
)
`
runCommand(Deno.args);



