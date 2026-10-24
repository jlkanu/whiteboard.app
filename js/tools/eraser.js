/**
 * Eraser Tool Handler (Object-based removing)
 */

import { history, DeleteObjectsCommand } from '../app/commands.js';
import { state } from '../app/state.js';
import { findTopObjectAt } from '../canvas/hit-testing.js';

export class EraserTool {
  constructor(toolManager) {
    this.toolManager = toolManager;
    this.isErasing = false;
    this.erasedSet = new Set();
  }

  onPointerDown(e, worldPos) {
    this.isErasing = true;
    this.erasedSet.clear();
    this.eraseAt(worldPos);
  }

  onPointerMove(e, worldPos) {
    if (!this.isErasing) return;
    this.eraseAt(worldPos);
  }

  onPointerUp(e, worldPos) {
    if (!this.isErasing) return;
    this.isErasing = false;

    if (this.erasedSet.size > 0) {
      const page = state.getActivePage();
      if (page) {
        const cmd = new DeleteObjectsCommand(page, Array.from(this.erasedSet));
        history.execute(cmd);
      }
    }
    this.erasedSet.clear();
  }

  eraseAt(worldPos) {
    const page = state.getActivePage();
    if (!page) return;

    const hitObj = findTopObjectAt(page.objects, worldPos.x, worldPos.y);
    if (hitObj && !this.erasedSet.has(hitObj)) {
      this.erasedSet.add(hitObj);
      // Temporarily remove from page for immediate visual feedback
      const idx = page.objects.indexOf(hitObj);
      if (idx !== -1) {
        page.objects.splice(idx, 1);
        state.notify('canvas');
      }
    }
  }

  onPointerCancel() {
    this.isErasing = false;
    this.erasedSet.clear();
  }
}
