/**
 * Whiteboard.app Document Schema Definition & Factory Helpers
 */

export const SCHEMA_VERSION = 1;

export const ObjectTypes = {
  STROKE: 'stroke',
  SHAPE: 'shape',
  TEXT: 'text',
  STICKY: 'sticky',
  IMAGE: 'image',
  CONNECTOR: 'connector'
};

export const ShapeTypes = {
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  TRIANGLE: 'triangle',
  DIAMOND: 'diamond',
  LINE: 'line',
  ARROW: 'arrow'
};

/**
 * Creates a unique string ID.
 */
export function generateId(prefix = 'obj') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Creates a new Document Object.
 */
export function createDocument(title = 'Untitled Board') {
  const now = Date.now();
  const defaultPageId = generateId('page');
  return {
    version: SCHEMA_VERSION,
    id: generateId('board'),
    title,
    createdAt: now,
    updatedAt: now,
    activePageId: defaultPageId,
    pages: [
      createPage('Page 1', defaultPageId)
    ],
    settings: {
      gridStyle: 'dots', // 'dots' | 'ruled' | 'graph' | 'blank'
      theme: 'light'
    }
  };
}

/**
 * Creates a new Page Object.
 */
export function createPage(name = 'New Page', id = generateId('page')) {
  return {
    id,
    name,
    objects: [],
    viewport: {
      x: 0,
      y: 0,
      zoom: 1.0
    }
  };
}

/**
 * Base Object Defaults
 */
export function createBaseObject(type, props = {}) {
  return {
    id: generateId(type),
    type,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: Date.now(),
    strokeColor: '#172033',
    strokeWidth: 2,
    strokeStyle: 'solid', // 'solid' | 'dashed'
    fillColor: 'transparent',
    ...props
  };
}

/**
 * Freehand Stroke Object
 */
export function createStrokeObject(points = [], props = {}) {
  return {
    ...createBaseObject(ObjectTypes.STROKE, props),
    points, // Array of {x, y, pressure}
    isHighlighter: props.isHighlighter || false
  };
}

/**
 * Shape Object
 */
export function createShapeObject(shapeType, x, y, width, height, props = {}) {
  return {
    ...createBaseObject(ObjectTypes.SHAPE, { x, y, width, height, ...props }),
    shapeType,
    lineStartMarker: props.lineStartMarker || 'none', // 'none' | 'arrow'
    lineEndMarker: props.lineEndMarker || (shapeType === ShapeTypes.ARROW ? 'arrow' : 'none')
  };
}

/**
 * Text Object
 */
export function createTextObject(text = '', x = 0, y = 0, props = {}) {
  return {
    ...createBaseObject(ObjectTypes.TEXT, { x, y, width: props.width || 120, height: props.height || 40, ...props }),
    text,
    fontSize: props.fontSize || 20,
    fontFamily: props.fontFamily || 'sans-serif',
    fontWeight: props.fontWeight || 'normal',
    textAlign: props.textAlign || 'left',
    textColor: props.textColor || '#172033'
  };
}

/**
 * Sticky Note Object
 */
export function createStickyObject(text = '', x = 0, y = 0, props = {}) {
  return {
    ...createBaseObject(ObjectTypes.STICKY, {
      x,
      y,
      width: props.width || 180,
      height: props.height || 180,
      fillColor: props.fillColor || '#FEF08A', // Soft yellow default
      strokeColor: 'transparent',
      ...props
    }),
    text,
    fontSize: props.fontSize || 16,
    textColor: props.textColor || '#172033'
  };
}

/**
 * Image Object
 */
export function createImageObject(assetId, x, y, width, height, props = {}) {
  return {
    ...createBaseObject(ObjectTypes.IMAGE, { x, y, width, height, ...props }),
    assetId // Reference to IndexedDB stored image Blob/DataURL
  };
}

/**
 * Connector Object
 */
export function createConnectorObject(startObjId, endObjId, props = {}) {
  return {
    ...createBaseObject(ObjectTypes.CONNECTOR, props),
    startObjId,
    endObjId,
    startBinding: props.startBinding || { x: 0.5, y: 0.5 }, // relative offset
    endBinding: props.endBinding || { x: 0.5, y: 0.5 }
  };
}
