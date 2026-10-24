/**
 * Global Keyboard Shortcuts Manager
 */

import { state } from '../app/state.js';
import { history, DeleteObjectsCommand } from '../app/commands.js';

export function setupKeyboardShortcuts(viewport) {
  window.addEventListener('keydown', (e) => {
    // Ignore shortcut when editing text inside input or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const isCtrlCmd = e.ctrlKey || e.metaKey;

    // Undo / Redo
    if (isCtrlCmd && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) {
        history.redo();
      } else {
        history.undo();
      }
      return;
    }

    if (isCtrlCmd && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      history.redo();
      return;
    }

    // Delete selected objects
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const page = state.getActivePage();
      if (page && state.selectedObjectIds.length > 0) {
        const selectedObjs = page.objects.filter(o => state.selectedObjectIds.includes(o.id));
        const cmd = new DeleteObjectsCommand(page, selectedObjs);
        history.execute(cmd);
        state.clearSelection();
      }
      return;
    }

    // Escape -> Clear selection or cancel
    if (e.key === 'Escape') {
      state.clearSelection();
      state.setActiveTool('select');
      return;
    }

    // Tool switching shortcuts
    switch (e.key.toLowerCase()) {
      case 'v':
        state.setActiveTool('select');
        break;
      case 'h':
        state.setActiveTool('hand');
        break;
      case 'p':
        state.setActiveTool('pen');
        break;
      case 'e':
        state.setActiveTool('eraser');
        break;
      case 't':
        state.setActiveTool('text');
        break;
      case 'r':
        state.setActiveTool('rectangle');
        break;
      case 'o':
        state.setActiveTool('ellipse');
        break;
      case '0':
        // Reset Zoom
        viewport.zoom = 1.0;
        viewport.x = 0;
        viewport.y = 0;
        state.notify('canvas');
        break;
      case '=':
      case '+':
        viewport.zoom = Math.min(5.0, viewport.zoom * 1.15);
        state.notify('canvas');
        break;
      case '-':
        viewport.zoom = Math.max(0.1, viewport.zoom * 0.85);
        state.notify('canvas');
        break;
    }
  });
}
