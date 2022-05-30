import { fps, render } from './animate';
import { bullets } from './bullets';
import { hitboxes } from './hitbox';
import { enemies } from './enemy';
import { from } from './Vector';
import { beginPath, restore, save, font, fillText } from './draw2';

render.add(() => {
  const thingsToShow = [
    { label: 'fps', textLog: fps() },
    { label: 'bullets', textLog: Object.keys(bullets()).length },
    { label: 'enemies', textLog: Object.keys(enemies()).length },
    { label: 'hitboxes', textLog: Object.keys(hitboxes()).length },
  ];
  thingsToShow.forEach(({ label, textLog }, index) => {
    save()
    beginPath()
    const fontSize = 40;
  
    const count = `${label}: ${textLog}`;
    const pos = from(10, fontSize + (index * fontSize));
    font(`${fontSize}px serif`)
    fillText(count, ...pos)
    restore()
  })
  
})
