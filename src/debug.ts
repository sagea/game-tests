import { fps, render } from './animate';
import { v } from './Vector';
import { beginPath, restore, save, font, fillText, lineTo, moveTo, lineWidth, strokeStyle, closePath, stroke } from './draw';
import { count, query } from './modules/ecs/entity';

render.add(() => {
  const metrics = [
    ['fps', fps()],
    ['bullets', count(['UserBullet'])],
    ['enemies', count(['Enemy'])],
    ['hitboxes', count(['Hitbox'])],
  ]
  metrics.forEach(([label, textLog], index) => {
    save()
    beginPath()
    const fontSize = 40;

    const count = `${label}: ${textLog}`;
    const pos = v(10, fontSize + (index * fontSize));
    font(`${fontSize}px serif`)
    fillText(count, ...pos)
    restore()
  })
})

render.add([
  99999,
  () => {
    for (let { Hitbox } of query(['Hitbox'])) {
      const { x, x2, y, y2 } = Hitbox();
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
])