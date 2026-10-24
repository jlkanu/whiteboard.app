/**
 * Geometric Shapes & Lines Tool Handler
 */

import { createShapeObject, ShapeTypes } from '../documents/schema.js';
import { history, AddObjectCommand } from '../app/commands.js';
import { state } from '../app/state.js';

export class ShapesTool {
  constructor(toolManager) {
    this.toolManager = toolManager;
    this.activeShape = null;
    this.isDrawing = false;
    this.startPos = { x: 0, y: 0 };
  }

  onPointerDown(e, worldPos) {
    this.isDrawing = true;
    this.startPos = { x: worldPos.x, y: worldPos.y };

    let shapeType = ShapeTypes.RECTANGLE;
    switch (state.activeTool) {
      case 'ellipse': shapeType = ShapeTypes.ELLIPSE; break;
      case 'triangle': shapeType = ShapeTypes.TRIANGLE; break;
      case 'diamond': shapeType = ShapeTypes.DIAMOND; break;
      case 'line': shapeType = ShapeTypes.LINE; break;
      case 'arrow': shapeType = ShapeTypes.ARROW; break;
      case 'connector': shapeType = ShapeTypes.LINE; break;
    }

    this.activeShape = createShapeObject(
      shapeType,
      worldPos.x,
      worldPos.y,
      0,
      0,
      {
        strokeColor: state.toolProps.strokeColor,
        strokeWidth: state.toolProps.strokeWidth,
        strokeStyle: state.toolProps.strokeStyle,
        fillColor: state.toolProps.fillColor
      }
    );

    this.toolManager.setActiveDraft(this.activeShape);
  }

  onPointerMove(e, worldPos) {
    if (!this.isDrawing || !this.activeShape) return;

    let width = worldPos.x - this.startPos.x;
    let height = worldPos.y - this.startPos.y;

    // Shift key constraint to square / 1:1 aspect ratio or 45 deg line
    if (e.shiftKey) {
      if (this.activeShape.shapeType === ShapeTypes.LINE || this.activeShape.shapeType === ShapeTypes.ARROW) {
        if (Math.abs(width) > Math.abs(height)) height = 0;
        else width = 0;
      } else {
        const side = Math.max(Math.abs(width), Math.abs(height));
        width = width < 0 ? -side : side;
        height = height < 0 ? -side : side;
      }
    }

    if (this.activeShape.shapeType === ShapeTypes.LINE || this.activeShape.shapeType === ShapeTypes.ARROW) {
      this.activeShape.x = this.startPos.x;
      this.activeShape.y = this.startPos.y;
      this.activeShape.width = width;
      this.activeShape.height = height;
    } else {
      this.activeShape.x = width < 0 ? this.startPos.x + width : this.startPos.x;
      this.activeShape.y = height < 0 ? this.startPos.y + height : this.startPos.y;
      this.activeShape.width = Math.abs(width);
      this.activeShape.height = Math.abs(height);
    }

    this.toolManager.setActiveDraft(this.activeShape);
  }

  onPointerUp(e, worldPos) {
    if (!this.isDrawing || !this.activeShape) return;

    this.isDrawing = false;
    this.toolManager.setActiveDraft(null);

    // Only add if shape has non-zero size
    if (Math.abs(this.activeShape.width) > 2 || Math.abs(this.activeShape.height) > 2) {
      const page = state.getActivePage();
      if (page) {
        const cmd = new AddObjectCommand(page, this.activeShape);
        history.execute(cmd);
        state.setSelectedObjectIds([this.activeShape.id]);
      }
    }

    this.activeShape = null;
    state.setActiveTool('select');
  }

  onPointerCancel() {
    this.isDrawing = false;
    this.toolManager.setActiveDraft(null);
    this.activeShape = null;
  }
}
