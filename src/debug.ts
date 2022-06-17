import { fps } from './modules/loop/mod.ts';
import { v } from './Vector.ts';
import { beginPath, restore, save, font, fillText, lineTo, moveTo, lineWidth, strokeStyle, closePath, stroke } from './draw.ts';
import { count, query, System, AppPlugin } from './modules/ecs/mod.ts';
import { UserBullet } from './bullets.ts';
import { Enemy } from './enemy.ts';
import { Hitbox } from './hitbox.ts';
import { EntityId } from './modules/ecs/mod.ts'
import { EMap } from './modules/generics/mod.ts'

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
export const debugRenderMenu = (): System => [
  debugRenderIndex,
  () => {
    let renderIndex = -1;
    const drawText = (label: string, textLog: string) => {
      renderIndex++;
      save()
      beginPath()
      const fontSize = 40;
  
      const count = `${label} ${textLog}`;
      const pos = v(10, fontSize + (renderIndex * fontSize));
      font(`${fontSize}px serif`)
      fillText(count, ...pos)
      restore()
    }
    addDebug('fps', fps());
    addDebug('Entities', count([EntityId]));
    addDebug('bullets', count([UserBullet]));
    addDebug('enemies', count([Enemy]));
    addDebug('hitboxes', count([Hitbox]));
    for (let [groupName, groupitems] of debugItems) {
      if (groupName !== '') {
        drawText(groupName, '');
      }
      let prefix = groupName !== '' ? '  ' : '';
      for (let [key, value] of groupitems) {
        // debugger;
        drawText(prefix + key, value.toString());
      }
    }
  }
]

export const renderHitboxes: System = [
  debugRenderIndex,
  () => {
    for (const { hitbox } of query({ hitbox: Hitbox})) {
      const { x, x2, y, y2 } = hitbox();
      save()
      beginPath()
      moveTo(x, y)
      lineTo(x2, y)
      lineTo(x2, y2)
      lineTo(x, y2)
      lineWidth(4);
      strokeStyle('blue')
      closePath()
      stroke()
      restore()
    }
  }
]

export const debugPlugin: AppPlugin = (app) => {

  app.addListener('prerun', () => {
    markEnd('cycle');
    const entries = [...performance.getEntries()]
      .filter(mark => Array.isArray(mark.detail))
      .filter(mark => mark.detail.includes('debug'));
    let started: Record<string, PerformanceEntry> = {};
    for (const mark of entries) {
      const isStart = mark.detail.includes('start');
      if (isStart) {
        started[mark.name] = mark;
      } else {
        const startedMark = started[mark.name];
        if (startedMark) {
          performance.measure(mark.name, { start: startedMark.startTime, end: mark.startTime });
        } else {
          console.warn(`mark not started ${mark.name}`);
        }
      }
    }
    entries.forEach(mark => performance.clearMarks(mark.name));
    performance.clearMarks();
    performance.clearMeasures();
    markStart('cycle');
    markStart('frame')
  })
  app.addListener('postrun', () => markEnd('frame'))
  app.addListener('presystem', () => markStart('system'))
  app.addListener('postsystem', () => markEnd('system'))
  app.addListener('prerender', () => markStart('render'))
  app.addListener('postrender', () => markEnd('render'))
  app.addListener('prefinal', () => markStart('final'))
  app.addListener('postfinal', () => markEnd('final'))
  app.addRenderSystem(renderHitboxes, debugRenderMenu())
}
