/**
 * Selection Handles & Bounding Controls
 */

import { getCombinedBounds } from './hit-testing.js';

export const HANDLE_SIZE = 8;

export const Handles = {
  NW: 'nw',
  N:  'n',
  NE: 'ne',
  E:  'e',
  SE: 'se',
  S:  's',
  SW: 'sw',
  W:  'w',
  ROTATION: 'rot'
};

/**
 * Returns list of handle positions for a bounds object.
 */
export function getSelectionHandles(bounds) {
  if (!bounds) return [];

  const { x, y, width, height } = bounds;

  return [
    { type: Handles.NW, x: x, y: y },
    { type: Handles.N,  x: x + width / 2, y: y },
    { type: Handles.NE, x: x + width, y: y },
    { type: Handles.E,  x: x + width, y: y + height / 2 },
    { type: Handles.SE, x: x + width, y: y + height },
    { type: Handles.S,  x: x + width / 2, y: y + height },
    { type: Handles.SW, x: x, y: y + height },
    { type: Handles.W,  x: x, y: y + height / 2 },
    { type: Handles.ROTATION, x: x + width / 2, y: y - 24 }
  ];
}

/**
 * Hit test handle at world coordinate (wx, wy)
 */
export function hitTestHandle(selectedObjects, wx, wy, zoom = 1.0) {
  if (!selectedObjects || selectedObjects.length === 0) return null;
  const bounds = getCombinedBounds(selectedObjects);
  if (!bounds) return null;

  const handles = getSelectionHandles(bounds);
  const hitRadius = (HANDLE_SIZE + 4) / zoom;

  for (const h of handles) {
    if (Math.hypot(wx - h.x, wy - h.y) <= hitRadius) {
      return h.type;
    }
  }

  return null;
}
