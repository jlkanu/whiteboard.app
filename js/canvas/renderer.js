/**
 * Canvas Renderer
 * Handles rendering background grids, artwork scene objects, active drafting states, selection outlines & handles.
 */

import { ObjectTypes, ShapeTypes } from '../documents/schema.js';
import { getObjectBounds, getCombinedBounds } from './hit-testing.js';
import { getSelectionHandles, HANDLE_SIZE } from './selection.js';
import { getAssetFromDB } from '../storage/database.js';

const imageCache = new Map();

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(width, height, dpr = 1) {
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  render({ viewport, page, gridStyle = 'dots', selectedObjectIds = [], activeDraft = null, selectionRect = null }) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply viewport transformation
    viewport.applyTransform(ctx);

    // 1. Render Background Grid
    this.renderGrid(ctx, viewport, gridStyle);

    // 2. Render Page Objects
    if (page && page.objects) {
      page.objects.forEach(obj => {
        this.renderObject(ctx, obj);
      });
    }

    // 3. Render Active Drafting Object (e.g. current stroke or shape being drawn)
    if (activeDraft) {
      this.renderObject(ctx, activeDraft);
    }

    // 4. Render Multi-selection Bounding Box / Selection Rect
    if (selectionRect) {
      this.renderSelectionRect(ctx, selectionRect);
    }

    // 5. Render Selected Object Bounds and Handles
    if (selectedObjectIds && selectedObjectIds.length > 0 && page) {
      const selectedObjs = page.objects.filter(o => selectedObjectIds.includes(o.id));
      if (selectedObjs.length > 0) {
        this.renderSelectionOverlay(ctx, selectedObjs, viewport.zoom);
      }
    }

    ctx.restore();
  }

  renderGrid(ctx, viewport, gridStyle) {
    if (gridStyle === 'blank') return;

    const zoom = viewport.zoom;
    const step = 24;
    const scaledStep = step;

    // Viewport bounds in world coords
    const startX = Math.floor(-viewport.x / zoom / step) * step - step;
    const startY = Math.floor(-viewport.y / zoom / step) * step - step;
    const endX = startX + (this.canvas.width / viewport.dpr / zoom) + step * 2;
    const endY = startY + (this.canvas.height / viewport.dpr / zoom) + step * 2;

    ctx.save();

    if (gridStyle === 'dots') {
      ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#334155' : '#cbd5e1';
      const dotRadius = Math.max(1 / zoom, 1);
      for (let x = startX; x < endX; x += scaledStep) {
        for (let y = startY; y < endY; y += scaledStep) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (gridStyle === 'graph' || gridStyle === 'ruled') {
      ctx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#e2e8f0';
      ctx.lineWidth = 1 / zoom;

      ctx.beginPath();
      for (let y = startY; y < endY; y += scaledStep) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }

      if (gridStyle === 'graph') {
        for (let x = startX; x < endX; x += scaledStep) {
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
        }
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  renderObject(ctx, obj) {
    ctx.save();
    ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1;

    switch (obj.type) {
      case ObjectTypes.STROKE:
        this.renderStroke(ctx, obj);
        break;
      case ObjectTypes.SHAPE:
        this.renderShape(ctx, obj);
        break;
      case ObjectTypes.TEXT:
        this.renderText(ctx, obj);
        break;
      case ObjectTypes.STICKY:
        this.renderSticky(ctx, obj);
        break;
      case ObjectTypes.IMAGE:
        this.renderImage(ctx, obj);
        break;
    }

    ctx.restore();
  }

  renderStroke(ctx, obj) {
    if (!obj.points || obj.points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = obj.strokeColor || '#172033';
    ctx.lineWidth = obj.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (obj.isHighlighter) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.4;
    }

    ctx.beginPath();
    const points = obj.points;
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 1) {
      ctx.arc(points[0].x, points[0].y, (obj.strokeWidth || 2) / 2, 0, Math.PI * 2);
      ctx.fillStyle = obj.strokeColor || '#172033';
      ctx.fill();
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderShape(ctx, obj) {
    ctx.save();
    ctx.strokeStyle = obj.strokeColor || '#172033';
    ctx.fillStyle = obj.fillColor || 'transparent';
    ctx.lineWidth = obj.strokeWidth || 2;

    if (obj.strokeStyle === 'dashed') {
      ctx.setLineDash([8, 6]);
    }

    const { x, y, width, height, shapeType } = obj;

    ctx.beginPath();
    switch (shapeType) {
      case ShapeTypes.RECTANGLE:
        ctx.rect(x, y, width, height);
        break;
      case ShapeTypes.ELLIPSE:
        ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2);
        break;
      case ShapeTypes.TRIANGLE:
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        break;
      case ShapeTypes.DIAMOND:
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width, y + height / 2);
        ctx.lineTo(x + width / 2, y + height);
        ctx.lineTo(x, y + height / 2);
        ctx.closePath();
        break;
      case ShapeTypes.LINE:
      case ShapeTypes.ARROW:
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y + height);
        break;
    }

    if (obj.fillColor && obj.fillColor !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();

    // Render Arrow head marker if arrow
    if (shapeType === ShapeTypes.ARROW || obj.lineEndMarker === 'arrow') {
      this.renderArrowHead(ctx, x, y, x + width, y + height, obj.strokeColor || '#172033');
    }

    ctx.restore();
  }

  renderArrowHead(ctx, x1, y1, x2, y2, color) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = 12;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle - Math.PI / 6),
      y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headLength * Math.cos(angle + Math.PI / 6),
      y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderText(ctx, obj) {
    ctx.save();
    ctx.font = `${obj.fontWeight || 'normal'} ${obj.fontSize || 20}px ${obj.fontFamily || 'sans-serif'}`;
    ctx.fillStyle = obj.textColor || obj.strokeColor || '#172033';
    ctx.textAlign = obj.textAlign || 'left';
    ctx.textBaseline = 'top';

    const lines = (obj.text || '').split('\n');
    const lineHeight = (obj.fontSize || 20) * 1.2;

    lines.forEach((line, index) => {
      ctx.fillText(line, obj.x, obj.y + index * lineHeight);
    });

    ctx.restore();
  }

  renderSticky(ctx, obj) {
    ctx.save();
    // Sticky card shadow
    ctx.fillStyle = obj.fillColor || '#FEF08A';
    ctx.strokeStyle = '#EAB308';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(obj.x, obj.y, obj.width, obj.height, 8);
    ctx.fill();
    ctx.stroke();

    // Sticky text
    ctx.font = `500 ${obj.fontSize || 16}px sans-serif`;
    ctx.fillStyle = obj.textColor || '#172033';
    ctx.textBaseline = 'top';

    const lines = (obj.text || '').split('\n');
    const lineHeight = (obj.fontSize || 16) * 1.25;
    const padding = 12;

    lines.forEach((line, index) => {
      ctx.fillText(line, obj.x + padding, obj.y + padding + index * lineHeight, obj.width - padding * 2);
    });

    ctx.restore();
  }

  renderImage(ctx, obj) {
    if (!obj.assetId) return;

    if (imageCache.has(obj.assetId)) {
      const img = imageCache.get(obj.assetId);
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
      }
    } else {
      // Async load from IndexedDB
      getAssetFromDB(obj.assetId).then(dataUrl => {
        if (dataUrl) {
          const img = new Image();
          img.onload = () => {
            imageCache.set(obj.assetId, img);
          };
          img.src = dataUrl;
        }
      }).catch(err => console.error('Error loading image asset:', err));
    }
  }

  renderSelectionRect(ctx, rect) {
    ctx.save();
    ctx.strokeStyle = '#4F46E5';
    ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }

  renderSelectionOverlay(ctx, selectedObjects, zoom) {
    const bounds = getCombinedBounds(selectedObjects);
    if (!bounds) return;

    ctx.save();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([]);

    // Bounding box outline
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Handles
    const handles = getSelectionHandles(bounds);
    const size = HANDLE_SIZE / zoom;

    handles.forEach(h => {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 1.5 / zoom;

      ctx.beginPath();
      if (h.type === 'rot') {
        // Rotation handle stem line
        ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
        ctx.lineTo(h.x, h.y);
        ctx.stroke();

        ctx.arc(h.x, h.y, size / 1.5, 0, Math.PI * 2);
      } else {
        ctx.rect(h.x - size / 2, h.y - size / 2, size, size);
      }
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }
}
