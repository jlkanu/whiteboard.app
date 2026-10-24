/**
 * Tool Manager & Pointer Input Router
 */

import { state } from '../app/state.js';
import { findTopObjectAt, findObjectsInRect, getCombinedBounds } from '../canvas/hit-testing.js';
import { hitTestHandle } from '../canvas/selection.js';
import { history, TransformObjectsCommand, DeleteObjectsCommand } from '../app/commands.js';
import { PenTool } from './pen.js';
import { EraserTool } from './eraser.js';
import { ShapesTool } from './shapes.js';
import { TextTool } from './text.js';
import { ImageTool } from './image.js';

export class ToolManager {
  constructor(canvas, viewport) {
    this.canvas = canvas;
    this.viewport = viewport;

    this.activeDraft = null;
    this.selectionRect = null;

    // Sub-tools
    this.penTool = new PenTool(this);
    this.eraserTool = new EraserTool(this);
    this.shapesTool = new ShapesTool(this);
    this.textTool = new TextTool(this);
    this.imageTool = new ImageTool(this);

    // Interaction modes for 'select' tool
    this.interactionState = null; // 'pan' | 'drag' | 'resize' | 'box-select'

    this.setupPointerListeners();
  }

  setActiveDraft(draft) {
    this.activeDraft = draft;
    state.notify('canvas');
  }

  setSelectionRect(rect) {
    this.selectionRect = rect;
    state.notify('canvas');
  }

  setupPointerListeners() {
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.handlePointerCancel(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
  }

  getWorldPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return this.viewport.screenToWorld(e.clientX, e.clientY, rect);
  }

  handlePointerDown(e) {
    this.canvas.setPointerCapture(e.pointerId);
    const worldPos = this.getWorldPos(e);
    const tool = state.activeTool;

    if (tool === 'hand' || e.button === 1 || e.spaceKey) {
      this.interactionState = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        startViewportX: this.viewport.x,
        startViewportY: this.viewport.y
      };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (tool === 'select') {
      const page = state.getActivePage();
      const selectedObjs = page.objects.filter(o => state.selectedObjectIds.includes(o.id));

      // 1. Check Handle Hit
      const hitHandle = hitTestHandle(selectedObjs, worldPos.x, worldPos.y, this.viewport.zoom);
      if (hitHandle) {
        const bounds = getCombinedBounds(selectedObjs);
        const beforeStates = {};
        selectedObjs.forEach(o => { beforeStates[o.id] = { ...o }; });

        this.interactionState = {
          type: 'resize',
          handle: hitHandle,
          startPos: worldPos,
          startBounds: bounds,
          selectedObjs,
          beforeStates
        };
        return;
      }

      // 2. Check Object Hit
      const hitObj = findTopObjectAt(page.objects, worldPos.x, worldPos.y);
      if (hitObj) {
        if (e.shiftKey) {
          // Toggle selection
          const current = state.selectedObjectIds;
          if (current.includes(hitObj.id)) {
            state.setSelectedObjectIds(current.filter(id => id !== hitObj.id));
          } else {
            state.setSelectedObjectIds([...current, hitObj.id]);
          }
        } else if (!state.selectedObjectIds.includes(hitObj.id)) {
          state.setSelectedObjectIds([hitObj.id]);
        }

        const currentSelected = page.objects.filter(o => state.selectedObjectIds.includes(o.id));
        const beforeStates = {};
        currentSelected.forEach(o => { beforeStates[o.id] = { ...o, points: o.points ? [...o.points] : undefined }; });

        this.interactionState = {
          type: 'drag',
          startPos: worldPos,
          selectedObjs: currentSelected,
          beforeStates
        };
        return;
      }

      // 3. Clicked empty space -> Clear selection and start Box Select
      if (!e.shiftKey) {
        state.clearSelection();
      }
      this.interactionState = {
        type: 'box-select',
        startPos: worldPos
      };
      return;
    }

    // Delegate to active tool handler
    switch (tool) {
      case 'pen':
      case 'pencil':
      case 'highlighter':
        this.penTool.onPointerDown(e, worldPos);
        break;
      case 'eraser':
        this.eraserTool.onPointerDown(e, worldPos);
        break;
      case 'line':
      case 'arrow':
      case 'rectangle':
      case 'ellipse':
      case 'triangle':
      case 'diamond':
      case 'connector':
        this.shapesTool.onPointerDown(e, worldPos);
        break;
      case 'text':
      case 'sticky':
        this.textTool.onPointerDown(e, worldPos);
        break;
      case 'image':
        this.imageTool.onPointerDown(e, worldPos);
        break;
    }
  }

  handlePointerMove(e) {
    const worldPos = this.getWorldPos(e);

    if (this.interactionState) {
      const st = this.interactionState;
      if (st.type === 'pan') {
        const dx = e.clientX - st.startX;
        const dy = e.clientY - st.startY;
        this.viewport.x = st.startViewportX + dx;
        this.viewport.y = st.startViewportY + dy;
        state.notify('canvas');
        return;
      }

      if (st.type === 'drag') {
        const dx = worldPos.x - st.startPos.x;
        const dy = worldPos.y - st.startPos.y;
        st.selectedObjs.forEach(obj => {
          const before = st.beforeStates[obj.id];
          if (obj.type === 'stroke' && before.points) {
            obj.points = before.points.map(p => ({ x: p.x + dx, y: p.y + dy, pressure: p.pressure }));
          } else {
            obj.x = before.x + dx;
            obj.y = before.y + dy;
          }
        });
        state.notify('canvas');
        return;
      }

      if (st.type === 'resize') {
        const dx = worldPos.x - st.startPos.x;
        const dy = worldPos.y - st.startPos.y;
        const sb = st.startBounds;

        let scaleX = 1;
        let scaleY = 1;

        if (st.handle.includes('e')) scaleX = (sb.width + dx) / sb.width;
        if (st.handle.includes('w')) scaleX = (sb.width - dx) / sb.width;
        if (st.handle.includes('s')) scaleY = (sb.height + dy) / sb.height;
        if (st.handle.includes('n')) scaleY = (sb.height - dy) / sb.height;

        scaleX = Math.max(0.05, scaleX);
        scaleY = Math.max(0.05, scaleY);

        st.selectedObjs.forEach(obj => {
          const before = st.beforeStates[obj.id];
          obj.width = Math.max(5, before.width * scaleX);
          obj.height = Math.max(5, before.height * scaleY);
        });
        state.notify('canvas');
        return;
      }

      if (st.type === 'box-select') {
        const rect = {
          x: Math.min(st.startPos.x, worldPos.x),
          y: Math.min(st.startPos.y, worldPos.y),
          width: Math.abs(worldPos.x - st.startPos.x),
          height: Math.abs(worldPos.y - st.startPos.y)
        };
        this.setSelectionRect(rect);
        return;
      }
    }

    const tool = state.activeTool;
    switch (tool) {
      case 'pen':
      case 'pencil':
      case 'highlighter':
        this.penTool.onPointerMove(e, worldPos);
        break;
      case 'eraser':
        this.eraserTool.onPointerMove(e, worldPos);
        break;
      case 'line':
      case 'arrow':
      case 'rectangle':
      case 'ellipse':
      case 'triangle':
      case 'diamond':
      case 'connector':
        this.shapesTool.onPointerMove(e, worldPos);
        break;
    }
  }

  handlePointerUp(e) {
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
    const worldPos = this.getWorldPos(e);

    if (this.interactionState) {
      const st = this.interactionState;
      if (st.type === 'pan') {
        this.canvas.style.cursor = 'crosshair';
      } else if (st.type === 'drag' || st.type === 'resize') {
        const afterStates = {};
        st.selectedObjs.forEach(o => {
          afterStates[o.id] = { ...o, points: o.points ? [...o.points] : undefined };
        });
        const cmd = new TransformObjectsCommand(st.selectedObjs, st.beforeStates, afterStates);
        history.execute(cmd);
      } else if (st.type === 'box-select' && this.selectionRect) {
        const page = state.getActivePage();
        const hitObjs = findObjectsInRect(page.objects, this.selectionRect);
        state.setSelectedObjectIds(hitObjs.map(o => o.id));
        this.setSelectionRect(null);
      }
      this.interactionState = null;
    }

    const tool = state.activeTool;
    switch (tool) {
      case 'pen':
      case 'pencil':
      case 'highlighter':
        this.penTool.onPointerUp(e, worldPos);
        break;
      case 'eraser':
        this.eraserTool.onPointerUp(e, worldPos);
        break;
      case 'line':
      case 'arrow':
      case 'rectangle':
      case 'ellipse':
      case 'triangle':
      case 'diamond':
      case 'connector':
        this.shapesTool.onPointerUp(e, worldPos);
        break;
    }
  }

  handlePointerCancel(e) {
    this.interactionState = null;
    this.setSelectionRect(null);
    this.setActiveDraft(null);
  }

  handleWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    this.viewport.zoomAtScreenPoint(delta, e.clientX, e.clientY, rect);
    state.notify('canvas');
  }
}
