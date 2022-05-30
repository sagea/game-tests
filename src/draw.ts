import { createEnum } from './utilities/generic'

let activeContext = null;
export const renderContext = (method: () => any) => {
  activeContext = [];
  method();
  let response = activeContext;
  activeContext = null;
  return response
}
const sendToContext = (item) => {
  if (!activeContext) throw new Error('Outside of context');
  activeContext.push(item);
}

export const e = createEnum(
'arcTo',
'beginPath',
'bezierCurveTo',
'clearRect',
'clip',
'closePath',
'createConicGradient',
'createImageData',
'createLinearGradient',
'createPattern',
'createRadialGradient',
'drawFocusIfNeeded',
'drawImage',
'ellipse',
'fill',
'fillRect',
'fillText',
'getContextAttributes',
'getImageData',
'getLineDash',
'getTransform',
'isContextLost',
'isPointInPath',
'isPointInStroke',
'lineTo',
'measureText',
'moveTo',
'putImageData',
'quadraticCurveTo',
'rect',
'reset',
'resetTransform',
'restore',
'rotate',
'roundRect',
'save',
'scale',
'setLineDash',
'setTransform',
'stroke',
'strokeRect',
'strokeText',
'transform',
'translate',


'direction',
'fillStyle',
'filter',
'font',
'fontKerning',
'fontStretch',
'fontVariantCaps',
'globalAlpha',
'globalCompositeOperation',
'imageSmoothingEnabled',
'imageSmoothingQuality',
'letterSpacing',
'lineCap',
'lineDashOffset',
'lineJoin',
'lineWidth',
'miterLimit',
'shadowBlur',
'shadowColor',
'shadowOffsetX',
'shadowOffsetY',
'strokeStyle',
'textAlign',
'textBaseline',
'textRendering',
'wordSpacing',
);

export const c = (e: number) => {
  return (...args) => sendToContext([e, args])
}
export const hf = () => (ctx, enumber, args) => {
  ctx[e[enumber]](...args);
}
export const hs = () => (ctx, enumber, [value]) => {
  ctx[e[enumber]] = value;
}

export const drawHandlers = new Map();
export const arcTo: CanvasRenderingContext2D['arcTo'] = c(e.arcTo);
export const beginPath: CanvasRenderingContext2D['beginPath'] = c(e.beginPath);
export const bezierCurveTo: CanvasRenderingContext2D['bezierCurveTo'] = c(e.bezierCurveTo);
export const clearRect: CanvasRenderingContext2D['clearRect'] = c(e.clearRect);
export const clip: CanvasRenderingContext2D['clip'] = c(e.clip);
export const closePath: CanvasRenderingContext2D['closePath'] = c(e.closePath);
export const createConicGradient: CanvasRenderingContext2D['createConicGradient'] = c(e.createConicGradient);
export const createImageData: CanvasRenderingContext2D['createImageData'] = c(e.createImageData);
export const createLinearGradient: CanvasRenderingContext2D['createLinearGradient'] = c(e.createLinearGradient);
export const createPattern: CanvasRenderingContext2D['createPattern'] = c(e.createPattern);
export const createRadialGradient: CanvasRenderingContext2D['createRadialGradient'] = c(e.createRadialGradient);
export const drawFocusIfNeeded: CanvasRenderingContext2D['drawFocusIfNeeded'] = c(e.drawFocusIfNeeded);
export const drawImage: CanvasRenderingContext2D['drawImage'] = c(e.drawImage);
export const ellipse: CanvasRenderingContext2D['ellipse'] = c(e.ellipse);
export const fill: CanvasRenderingContext2D['fill'] = c(e.fill);
export const fillRect: CanvasRenderingContext2D['fillRect'] = c(e.fillRect);
export const fillText: CanvasRenderingContext2D['fillText'] = c(e.fillText);
export const getContextAttributes: CanvasRenderingContext2D['getContextAttributes'] = c(e.getContextAttributes);
export const getImageData: CanvasRenderingContext2D['getImageData'] = c(e.getImageData);
export const getLineDash: CanvasRenderingContext2D['getLineDash'] = c(e.getLineDash);
export const getTransform: CanvasRenderingContext2D['getTransform'] = c(e.getTransform);
export const isContextLost: CanvasRenderingContext2D['isContextLost'] = c(e.isContextLost);
export const isPointInPath: CanvasRenderingContext2D['isPointInPath'] = c(e.isPointInPath);
export const isPointInStroke: CanvasRenderingContext2D['isPointInStroke'] = c(e.isPointInStroke);
export const lineTo: CanvasRenderingContext2D['lineTo'] = c(e.lineTo);
export const measureText: CanvasRenderingContext2D['measureText'] = c(e.measureText);
export const moveTo: CanvasRenderingContext2D['moveTo'] = c(e.moveTo);
export const putImageData: CanvasRenderingContext2D['putImageData'] = c(e.putImageData);
export const quadraticCurveTo: CanvasRenderingContext2D['quadraticCurveTo'] = c(e.quadraticCurveTo);
export const rect: CanvasRenderingContext2D['rect'] = c(e.rect);
export const reset: CanvasRenderingContext2D['reset'] = c(e.reset);
export const resetTransform: CanvasRenderingContext2D['resetTransform'] = c(e.resetTransform);
export const restore: CanvasRenderingContext2D['restore'] = c(e.restore);
export const rotate: CanvasRenderingContext2D['rotate'] = c(e.rotate);
export const roundRect: CanvasRenderingContext2D['roundRect'] = c(e.roundRect);
export const save: CanvasRenderingContext2D['save'] = c(e.save);
export const scale: CanvasRenderingContext2D['scale'] = c(e.scale);
export const setLineDash: CanvasRenderingContext2D['setLineDash'] = c(e.setLineDash);
export const setTransform: CanvasRenderingContext2D['setTransform'] = c(e.setTransform);
export const stroke: CanvasRenderingContext2D['stroke'] = c(e.stroke);
export const strokeRect: CanvasRenderingContext2D['strokeRect'] = c(e.strokeRect);
export const strokeText: CanvasRenderingContext2D['strokeText'] = c(e.strokeText);
export const transform: CanvasRenderingContext2D['transform'] = c(e.transform);
export const translate: CanvasRenderingContext2D['translate'] = c(e.translate);
drawHandlers.set(e.arcTo, hf());
drawHandlers.set(e.beginPath, hf());
drawHandlers.set(e.bezierCurveTo, hf());
drawHandlers.set(e.clearRect, hf());
drawHandlers.set(e.clip, hf());
drawHandlers.set(e.closePath, hf());
drawHandlers.set(e.createConicGradient, hf());
drawHandlers.set(e.createImageData, hf());
drawHandlers.set(e.createLinearGradient, hf());
drawHandlers.set(e.createPattern, hf());
drawHandlers.set(e.createRadialGradient, hf());
drawHandlers.set(e.drawFocusIfNeeded, hf());
drawHandlers.set(e.drawImage, hf());
drawHandlers.set(e.ellipse, hf());
drawHandlers.set(e.fill, hf());
drawHandlers.set(e.fillRect, hf());
drawHandlers.set(e.fillText, hf());
drawHandlers.set(e.getContextAttributes, hf());
drawHandlers.set(e.getImageData, hf());
drawHandlers.set(e.getLineDash, hf());
drawHandlers.set(e.getTransform, hf());
drawHandlers.set(e.isContextLost, hf());
drawHandlers.set(e.isPointInPath, hf());
drawHandlers.set(e.isPointInStroke, hf());
drawHandlers.set(e.lineTo, hf());
drawHandlers.set(e.measureText, hf());
drawHandlers.set(e.moveTo, hf());
drawHandlers.set(e.putImageData, hf());
drawHandlers.set(e.quadraticCurveTo, hf());
drawHandlers.set(e.rect, hf());
drawHandlers.set(e.reset, hf());
drawHandlers.set(e.resetTransform, hf());
drawHandlers.set(e.restore, hf());
drawHandlers.set(e.rotate, hf());
drawHandlers.set(e.roundRect, hf());
drawHandlers.set(e.save, hf());
drawHandlers.set(e.scale, hf());
drawHandlers.set(e.setLineDash, hf());
drawHandlers.set(e.setTransform, hf());
drawHandlers.set(e.stroke, hf());
drawHandlers.set(e.strokeRect, hf());
drawHandlers.set(e.strokeText, hf());
drawHandlers.set(e.transform, hf());
drawHandlers.set(e.translate, hf());

type SetMethod<T> = (value: T) => void;
export const direction: SetMethod<CanvasRenderingContext2D['direction']> = c(e.direction);
export const fillStyle: SetMethod<CanvasRenderingContext2D['fillStyle']> = c(e.fillStyle);
export const filter: SetMethod<CanvasRenderingContext2D['filter']> = c(e.filter);
export const font: SetMethod<CanvasRenderingContext2D['font']> = c(e.font);
export const fontKerning: SetMethod<CanvasRenderingContext2D['fontKerning']> = c(e.fontKerning);
export const fontStretch: SetMethod<CanvasRenderingContext2D['fontStretch']> = c(e.fontStretch);
export const fontVariantCaps: SetMethod<CanvasRenderingContext2D['fontVariantCaps']> = c(e.fontVariantCaps);
export const globalAlpha: SetMethod<CanvasRenderingContext2D['globalAlpha']> = c(e.globalAlpha);
export const globalCompositeOperation: SetMethod<CanvasRenderingContext2D['globalCompositeOperation']> = c(e.globalCompositeOperation);
export const imageSmoothingEnabled: SetMethod<CanvasRenderingContext2D['imageSmoothingEnabled']> = c(e.imageSmoothingEnabled);
export const imageSmoothingQuality: SetMethod<CanvasRenderingContext2D['imageSmoothingQuality']> = c(e.imageSmoothingQuality);
export const letterSpacing: SetMethod<CanvasRenderingContext2D['letterSpacing']> = c(e.letterSpacing);
export const lineCap: SetMethod<CanvasRenderingContext2D['lineCap']> = c(e.lineCap);
export const lineDashOffset: SetMethod<CanvasRenderingContext2D['lineDashOffset']> = c(e.lineDashOffset);
export const lineJoin: SetMethod<CanvasRenderingContext2D['lineJoin']> = c(e.lineJoin);
export const lineWidth: SetMethod<CanvasRenderingContext2D['lineWidth']> = c(e.lineWidth);
export const miterLimit: SetMethod<CanvasRenderingContext2D['miterLimit']> = c(e.miterLimit);
export const shadowBlur: SetMethod<CanvasRenderingContext2D['shadowBlur']> = c(e.shadowBlur);
export const shadowColor: SetMethod<CanvasRenderingContext2D['shadowColor']> = c(e.shadowColor);
export const shadowOffsetX: SetMethod<CanvasRenderingContext2D['shadowOffsetX']> = c(e.shadowOffsetX);
export const shadowOffsetY: SetMethod<CanvasRenderingContext2D['shadowOffsetY']> = c(e.shadowOffsetY);
export const strokeStyle: SetMethod<CanvasRenderingContext2D['strokeStyle']> = c(e.strokeStyle);
export const textAlign: SetMethod<CanvasRenderingContext2D['textAlign']> = c(e.textAlign);
export const textBaseline: SetMethod<CanvasRenderingContext2D['textBaseline']> = c(e.textBaseline);
export const textRendering: SetMethod<CanvasRenderingContext2D['textRendering']> = c(e.textRendering);
export const wordSpacing: SetMethod<CanvasRenderingContext2D['wordSpacing']> = c(e.wordSpacing);
drawHandlers.set(e.direction, hs());
drawHandlers.set(e.fillStyle, hs());
drawHandlers.set(e.filter, hs());
drawHandlers.set(e.font, hs());
drawHandlers.set(e.fontKerning, hs());
drawHandlers.set(e.fontStretch, hs());
drawHandlers.set(e.fontVariantCaps, hs());
drawHandlers.set(e.globalAlpha, hs());
drawHandlers.set(e.globalCompositeOperation, hs());
drawHandlers.set(e.imageSmoothingEnabled, hs());
drawHandlers.set(e.imageSmoothingQuality, hs());
drawHandlers.set(e.letterSpacing, hs());
drawHandlers.set(e.lineCap, hs());
drawHandlers.set(e.lineDashOffset, hs());
drawHandlers.set(e.lineJoin, hs());
drawHandlers.set(e.lineWidth, hs());
drawHandlers.set(e.miterLimit, hs());
drawHandlers.set(e.shadowBlur, hs());
drawHandlers.set(e.shadowColor, hs());
drawHandlers.set(e.shadowOffsetX, hs());
drawHandlers.set(e.shadowOffsetY, hs());
drawHandlers.set(e.strokeStyle, hs());
drawHandlers.set(e.textAlign, hs());
drawHandlers.set(e.textBaseline, hs());
drawHandlers.set(e.textRendering, hs());
drawHandlers.set(e.wordSpacing, hs());

export const executeOnCanvas = (ctx, [enumber, args]) => {
  drawHandlers.get(enumber)(ctx, enumber, args)
};