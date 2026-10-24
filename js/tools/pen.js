/**
 * Freehand Pen / Sketch Pencil / Highlighter Tool Handler
 */

import { createStrokeObject } from '../documents/schema.js';
import { history, AddObjectCommand } from '../app/commands.js';
import { state } from '../app/state.js';

export class PenTool {
  constructor(toolManager) {
    this.toolManager = toolManager;
    this.activeStroke = null;
    this.isDrawing = false;
  }

  onPointerDown(e, worldPos) {
    this.isDrawing = true;
    const isHighlighter = state.activeTool === 'highlighter';
    const isPencil = state.activeTool === 'pencil';

    const strokeColor = isHighlighter
      ? state.toolProps.highlighterColor
      : state.toolProps.strokeColor;

    const strokeWidth = isHighlighter
      ? state.toolProps.highlighterWidth
      : isPencil
      ? 1
      : state.toolProps.strokeWidth;

    this.activeStroke = createStrokeObject(
      [{ x: worldPos.x, y: worldPos.y, pressure: e.pressure || 0.5 }],
      {
        strokeColor,
        strokeWidth,
        isHighlighter
      }
    );

    this.toolManager.setActiveDraft(this.activeStroke);
  }

  onPointerMove(e, worldPos) {
    if (!this.isDrawing || !this.activeStroke) return;

    this.activeStroke.points.push({
      x: worldPos.x,
      y: worldPos.y,
      pressure: e.pressure || 0.5
    });

    this.toolManager.setActiveDraft(this.activeStroke);
  }

  onPointerUp(e, worldPos) {
    if (!this.isDrawing || !this.activeStroke) return;

    this.isDrawing = false;
    this.toolManager.setActiveDraft(null);

    const page = state.getActivePage();
    if (page && this.activeStroke.points.length > 0) {
      const cmd = new AddObjectCommand(page, this.activeStroke);
      history.execute(cmd);
    }

    this.activeStroke = null;
  }

  onPointerCancel() {
    this.isDrawing = false;
    this.toolManager.setActiveDraft(null);
    this.activeStroke = null;
  }
}
