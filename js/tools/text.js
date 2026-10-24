/**
 * Text & Sticky Notes Tool Handler
 */

import { createTextObject, createStickyObject } from '../documents/schema.js';
import { history, AddObjectCommand } from '../app/commands.js';
import { state } from '../app/state.js';

export class TextTool {
  constructor(toolManager) {
    this.toolManager = toolManager;
  }

  onPointerDown(e, worldPos) {
    const isSticky = state.activeTool === 'sticky';
    const page = state.getActivePage();
    if (!page) return;

    if (isSticky) {
      const sticky = createStickyObject(
        'Double click to edit',
        worldPos.x,
        worldPos.y,
        {
          fillColor: state.toolProps.stickyColor,
          textColor: state.toolProps.textColor
        }
      );
      const cmd = new AddObjectCommand(page, sticky);
      history.execute(cmd);
      state.setSelectedObjectIds([sticky.id]);
      state.setActiveTool('select');
      this.startInlineEditing(sticky);
    } else {
      const textObj = createTextObject(
        'Type text here',
        worldPos.x,
        worldPos.y,
        {
          fontSize: state.toolProps.fontSize,
          fontFamily: state.toolProps.fontFamily,
          textColor: state.toolProps.textColor
        }
      );
      const cmd = new AddObjectCommand(page, textObj);
      history.execute(cmd);
      state.setSelectedObjectIds([textObj.id]);
      state.setActiveTool('select');
      this.startInlineEditing(textObj);
    }
  }

  onPointerMove() {}
  onPointerUp() {}
  onPointerCancel() {}

  /**
   * Spawns HTML Overlay textarea for editable text/sticky object.
   */
  startInlineEditing(obj) {
    const container = document.getElementById('text-overlay-container');
    if (!container) return;

    const viewport = this.toolManager.viewport;
    const canvasRect = this.toolManager.canvas.getBoundingClientRect();
    const screenPos = viewport.worldToScreen(obj.x, obj.y, canvasRect);

    const textarea = document.createElement('textarea');
    textarea.className = obj.type === 'sticky' ? 'sticky-note-editor' : 'inline-editor';
    textarea.value = obj.text;

    textarea.style.left = `${screenPos.x}px`;
    textarea.style.top = `${screenPos.y}px`;
    textarea.style.width = `${obj.width * viewport.zoom}px`;
    textarea.style.height = `${obj.height * viewport.zoom}px`;
    textarea.style.fontSize = `${(obj.fontSize || 18) * viewport.zoom}px`;

    if (obj.type === 'sticky') {
      textarea.style.backgroundColor = obj.fillColor;
    } else {
      textarea.style.color = obj.textColor || '#172033';
    }

    textarea.style.pointerEvents = 'auto';

    const commitChange = () => {
      const val = textarea.value.trim();
      if (val !== obj.text) {
        obj.text = val;
        state.markDirty();
      }
      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
    };

    textarea.onblur = commitChange;
    textarea.onkeydown = (e) => {
      if (e.key === 'Escape') {
        commitChange();
      }
    };

    container.appendChild(textarea);
    textarea.focus();
    textarea.select();
  }
}
