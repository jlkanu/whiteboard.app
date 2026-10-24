/**
 * Hit-Testing & Selection Bounds Calculation
 */

import { ObjectTypes, ShapeTypes } from '../documents/schema.js';

const HIT_PADDING = 8;

/**
 * Computes bounding box {x, y, width, height} for any object.
 */
export function getObjectBounds(obj) {
  if (obj.type === ObjectTypes.STROKE) {
    if (!obj.points || obj.points.length === 0) {
      return { x: obj.x, y: obj.y, width: 0, height: 0 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    obj.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    const strokeWidth = obj.strokeWidth || 2;
    return {
      x: minX - strokeWidth / 2,
      y: minY - strokeWidth / 2,
      width: (maxX - minX) + strokeWidth,
      height: (maxY - minY) + strokeWidth
    };
  }

  const x = Math.min(obj.x, obj.x + (obj.width || 0));
  const y = Math.min(obj.y, obj.y + (obj.height || 0));
  const width = Math.abs(obj.width || 0);
  const height = Math.abs(obj.height || 0);

  return { x, y, width, height };
}

/**
 * Computes combined bounding box for multiple objects.
 */
export function getCombinedBounds(objects) {
  if (!objects || objects.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  objects.forEach(obj => {
    const b = getObjectBounds(obj);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  });
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Checks if a point (wx, wy) hits an object.
 */
export function hitTestObject(obj, wx, wy) {
  const bounds = getObjectBounds(obj);

  // Quick bounding box check
  if (
    wx < bounds.x - HIT_PADDING ||
    wx > bounds.x + bounds.width + HIT_PADDING ||
    wy < bounds.y - HIT_PADDING ||
    wy > bounds.y + bounds.height + HIT_PADDING
  ) {
    return false;
  }

  // Precise stroke hit testing
  if (obj.type === ObjectTypes.STROKE) {
    const threshold = Math.max((obj.strokeWidth || 2) / 2 + HIT_PADDING, 8);
    for (let i = 0; i < obj.points.length - 1; i++) {
      const p1 = obj.points[i];
      const p2 = obj.points[i + 1];
      if (distToSegment({ x: wx, y: wy }, p1, p2) <= threshold) {
        return true;
      }
    }
    return false;
  }

  // Filled shapes / Sticky / Text / Image
  if (obj.fillColor && obj.fillColor !== 'transparent') {
    return true;
  }

  // Outline hit testing for unfilled shapes / lines
  if (obj.type === ObjectTypes.SHAPE) {
    if (obj.shapeType === ShapeTypes.LINE || obj.shapeType === ShapeTypes.ARROW) {
      const p1 = { x: obj.x, y: obj.y };
      const p2 = { x: obj.x + obj.width, y: obj.y + obj.height };
      return distToSegment({ x: wx, y: wy }, p1, p2) <= Math.max((obj.strokeWidth || 2) / 2 + HIT_PADDING, 8);
    }
  }

  return true;
}

/**
 * Finds top-most object hit at (wx, wy).
 */
export function findTopObjectAt(objects, wx, wy) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (hitTestObject(obj, wx, wy)) {
      return obj;
    }
  }
  return null;
}

/**
 * Returns all objects intersecting selection rect {x, y, width, height}.
 */
export function findObjectsInRect(objects, rect) {
  const rx1 = Math.min(rect.x, rect.x + rect.width);
  const rx2 = Math.max(rect.x, rect.x + rect.width);
  const ry1 = Math.min(rect.y, rect.y + rect.height);
  const ry2 = Math.max(rect.y, rect.y + rect.height);

  return objects.filter(obj => {
    const b = getObjectBounds(obj);
    return (
      b.x < rx2 &&
      b.x + b.width > rx1 &&
      b.y < ry2 &&
      b.y + b.height > ry1
    );
  });
}

function distToSegment(p, v, w) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
