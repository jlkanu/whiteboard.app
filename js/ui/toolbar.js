/**
 * Primary Toolbar Component Controller
 */

import { state } from '../app/state.js';

export class ToolbarController {
  constructor() {
    this.dock = document.getElementById('tool-dock');
    this.setupListeners();
    this.updateActiveToolUI(state.activeTool);
  }

  setupListeners() {
    if (!this.dock) return;

    this.dock.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tool]');
      if (btn) {
        const tool = btn.getAttribute('data-tool');
        state.setActiveTool(tool);
      }
    });

    state.subscribe((event) => {
      if (event === 'tool') {
        this.updateActiveToolUI(state.activeTool);
      }
    });
  }

  updateActiveToolUI(activeTool) {
    if (!this.dock) return;
    const buttons = this.dock.querySelectorAll('button[data-tool]');
    buttons.forEach(btn => {
      if (btn.getAttribute('data-tool') === activeTool) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}
