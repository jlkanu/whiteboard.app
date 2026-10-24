/**
 * Coordinates & Viewport Transformation Matrix
 * Maps screen pointer pixels <-> canvas world coordinates with smooth zooming towards pointer and pan.
 */

export class Viewport {
  constructor() {
    this.x = 0;      // Pan offset X
    this.y = 0;      // Pan offset Y
    this.zoom = 1.0; // Zoom factor
    this.minZoom = 0.1;
    this.maxZoom = 5.0;
    this.dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  }

  setViewport(x, y, zoom) {
    this.x = x;
    this.y = y;
    this.zoom = Math.min(Math.max(zoom, this.minZoom), this.maxZoom);
  }

  updateDPR() {
    this.dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  }

  /**
   * Screen pixel coordinate -> Canvas world coordinate
   */
  screenToWorld(screenX, screenY, canvasBoundingRect) {
    const relX = screenX - (canvasBoundingRect ? canvasBoundingRect.left : 0);
    const relY = screenY - (canvasBoundingRect ? canvasBoundingRect.top : 0);
    return {
      x: (relX - this.x) / this.zoom,
      y: (relY - this.y) / this.zoom
    };
  }

  /**
   * Canvas world coordinate -> Screen pixel coordinate
   */
  worldToScreen(worldX, worldY, canvasBoundingRect) {
    const relX = worldX * this.zoom + this.x;
    const relY = worldY * this.zoom + this.y;
    return {
      x: relX + (canvasBoundingRect ? canvasBoundingRect.left : 0),
      y: relY + (canvasBoundingRect ? canvasBoundingRect.top : 0)
    };
  }

  /**
   * Zooms in or out centered at a screen point (e.g. mouse cursor)
   */
  zoomAtScreenPoint(deltaZoom, screenX, screenY, canvasBoundingRect) {
    const worldBefore = this.screenToWorld(screenX, screenY, canvasBoundingRect);
    const newZoom = Math.min(Math.max(this.zoom * deltaZoom, this.minZoom), this.maxZoom);
    
    // Adjust x, y pan offset so worldBefore stays under screen position
    const relX = screenX - (canvasBoundingRect ? canvasBoundingRect.left : 0);
    const relY = screenY - (canvasBoundingRect ? canvasBoundingRect.top : 0);

    this.zoom = newZoom;
    this.x = relX - worldBefore.x * this.zoom;
    this.y = relY - worldBefore.y * this.zoom;
  }

  /**
   * Applies view transform to canvas context
   */
  applyTransform(ctx) {
    ctx.scale(this.dpr, this.dpr);
    ctx.translate(this.x, this.y);
    ctx.scale(this.zoom, this.zoom);
  }
}
