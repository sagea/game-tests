import { fps } from './modules/loop/mod.ts';
import { v, Vector } from './Vector.ts';
import { count, query, System, AppPlugin } from './modules/ecs/mod.ts';
import { UserBullet } from './bullets.ts';
import { Enemy } from './enemy.ts';
import { Hitbox } from './hitbox.ts';
import { EntityId } from './modules/ecs/mod.ts'
import { EMap } from './modules/generics/mod.ts'
import { createMethod } from './modules/Sprite/mod.ts'
import * as perf from './perf.ts';

const debugEnabled = true;
export const debugRenderIndex = 99999;
const avg = (s: number[]) => {
  if (s.length === 0) return 0;
  return s.reduce((a, b) => a + b, 0) / s.length
};
type DebugValue = string | number;
type DebugGroup = Map<string, DebugValue>
let debugItems = new Map<string, DebugGroup>()
export const markStart = (label: string) => {
  performance.mark(label, { detail: ['debug', 'start'] });
}
export const markEnd = (label: string) => {
  performance.mark(label, { detail: ['debug', 'end'] });
}

const addToGroup = (group: string, label: string, value: DebugValue) => {
  let groupedItems = debugItems.get(group);
  if (!groupedItems) {
    const val = new Map<string, DebugValue>();
    debugItems.set(group, val);
    debugItems = new Map([...debugItems.entries()].sort(([a], [b]) => a.localeCompare(b)))
    groupedItems = val;
  }
  debugItems.set(group, groupedItems);
  groupedItems.set(label, value);
}
export const addDebug = (label: string, value: DebugValue, group = '') => {
  addToGroup(group, label, value);
}

export const debugMethod = <CB extends (...args: any[]) => any>(name: string, cb: CB): CB => (...args: Parameters<CB>): ReturnType<CB> => {
  markStart(name)
  const r = cb(...args)
  markEnd(name);
  return r;
}

const debugTimers = new EMap<string, number[]>(() => []);
type AddDebugTimerOptions = {
  group?: string,
  sample?: number,
}
export const addDebugTimer = (label: string, {
  group = '',
  sample = 50,
}: AddDebugTimerOptions = {}) => {
  const s = performance.now();
  return () => {
    const result = performance.now() - s;
    const res = [...debugTimers.get(label), result].slice(-sample)
    debugTimers.set(label, res);
    addDebug(label, avg(res).toFixed(2), group);
  }
}
const drawText = createMethod((ctx, renderIndex: number, label: string, textLog: string) => {
  performance.mark('drawText')
  ctx.save()
  ctx.beginPath()
  const fontSize = 40;

  const count = `${label} ${textLog}`;
  const pos = v(10, fontSize + (renderIndex * fontSize));
  ctx.font = `${fontSize}px serif`;
  ctx.fillText(count, ...pos)
  ctx.restore()
  performance.mark('drawText')
})

const drawHitbox = createMethod((ctx, x, y, x2, y2) => {
  const id = 'drawHitbox' + Math.random();
  performance.mark(id)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x2, y)
  ctx.lineTo(x2, y2)
  ctx.lineTo(x, y2)
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'blue';
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
  performance.mark(id)
});

export const debugRenderMenu: System<any> = () => {
  let renderIndex = 0;
  addDebug('fps', fps());
  addDebug('Entities', count([EntityId]));
  addDebug('bullets', count([UserBullet]));
  addDebug('enemies', count([Enemy]));
  addDebug('hitboxes', count([Hitbox]));
  for (let [groupName, groupitems] of debugItems) {
    if (groupName !== '') {
      drawText(renderIndex++, groupName, '');
    }
    let prefix = groupName !== '' ? '  ' : '';
    for (let [key, value] of groupitems) {
      drawText(renderIndex++, prefix + key, value.toString());
    }
  }
};

export const renderHitboxes: System<any> = () => {
  for (const { hitbox } of query({ hitbox: Hitbox})) {
    const { x, x2, y, y2 } = hitbox();
    drawHitbox(x, y, x2, y2);
  }
}

export const debugPlugin: AppPlugin<any> = (app) => {
  app
    .addSystem('start', { stage: 'pre' }, () => {
      perf.reset();
      perf.start('frame')
    })
    .addSystem('end', { stage: 'post' }, () => perf.end('frame'))
    .addSystem('init', { stage: 'pre' }, () => perf.start('init'))
    .addSystem('init', { stage: 'post' }, () => perf.end('init'))
    .addSystem({ stage: 'pre' }, () => perf.start('main'))
    .addSystem({ stage: 'post' }, () => perf.end('main'))
    .addSystem('render', { stage: 'pre', order: -Infinity }, () => perf.start('render'))
    .addSystem('render', { stage: 'post', order: Infinity }, () => perf.end('render'))
    .addSystem('render', { order: debugRenderIndex }, renderHitboxes, debugRenderMenu);
}
