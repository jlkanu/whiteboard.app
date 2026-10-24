/**
 * Contextual Inspector Panel Component Controller
 */

import { state } from '../app/state.js';
import { history, PropertyChangeCommand, DeleteObjectsCommand } from '../app/commands.js';

const PALETTE = [
  '#172033', '#64748B', '#EF4444', '#F59E0B', '#10B981',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#FFFFFF'
];

const STICKY_PALETTE = [
  '#FEF08A', '#BAE6FD', '#BBF7D0', '#FBCFE8', '#FED7AA'
];

export class InspectorController {
  constructor() {
    this.panel = document.getElementById('inspector-panel');
    this.setupListeners();
  }

  setupListeners() {
    state.subscribe((event) => {
      if (event === 'selection' || event === 'tool' || event === 'canvas') {
        this.render();
      }
    });
  }

  render() {
    if (!this.panel) return;

    const page = state.getActivePage();
    if (!page) return;

    const selectedObjs = page.objects.filter(o => state.selectedObjectIds.includes(o.id));

    if (selectedObjs.length === 0) {
      this.renderWorkspaceInspector();
      return;
    }

    this.panel.classList.remove('hidden');
    const first = selectedObjs[0];

    let html = `<div style="display:flex; justify-between; align-items:center; margin-bottom:12px;">
      <span style="font-weight:600; font-size: var(--font-size-sm); text-transform:uppercase; color:var(--text-secondary);">
        ${selectedObjs.length > 1 ? `${selectedObjs.length} Items Selected` : first.type}
      </span>
      <button id="btn-delete-selected" class="btn btn-icon sm btn-subtle" title="Delete (Delete/Backspace)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>`;

    // Stroke Color Control
    if (first.type === 'stroke' || first.type === 'shape' || first.type === 'line' || first.type === 'arrow') {
      html += `<div class="property-group">
        <label class="property-label">Stroke Color</label>
        <div class="color-swatch-grid">
          ${PALETTE.map(c => `
            <button class="color-swatch ${first.strokeColor === c ? 'active' : ''}" data-prop="strokeColor" data-val="${c}" style="background-color: ${c};"></button>
          `).join('')}
        </div>
      </div>`;

      html += `<div class="property-group">
        <label class="property-label">Stroke Width (${first.strokeWidth || 2}px)</label>
        <input type="range" id="inspector-stroke-width" min="1" max="20" value="${first.strokeWidth || 2}" style="width:100%;">
      </div>`;
    }

    // Fill Color Control
    if (first.type === 'shape') {
      html += `<div class="property-group">
        <label class="property-label">Fill Color</label>
        <div class="color-swatch-grid">
          <button class="color-swatch ${first.fillColor === 'transparent' ? 'active' : ''}" data-prop="fillColor" data-val="transparent" style="background-color: transparent; border: 1px dashed var(--border-strong);"></button>
          ${PALETTE.map(c => `
            <button class="color-swatch ${first.fillColor === c ? 'active' : ''}" data-prop="fillColor" data-val="${c}" style="background-color: ${c};"></button>
          `).join('')}
        </div>
      </div>`;
    }

    // Sticky Color Control
    if (first.type === 'sticky') {
      html += `<div class="property-group">
        <label class="property-label">Sticky Color</label>
        <div class="color-swatch-grid">
          ${STICKY_PALETTE.map(c => `
            <button class="color-swatch ${first.fillColor === c ? 'active' : ''}" data-prop="fillColor" data-val="${c}" style="background-color: ${c};"></button>
          `).join('')}
        </div>
      </div>`;
    }

    this.panel.innerHTML = html;
    this.bindInspectorEvents(selectedObjs);
  }

  renderWorkspaceInspector() {
    this.panel.classList.remove('hidden');
    this.panel.innerHTML = `
      <div class="property-group">
        <label class="property-label">Canvas Settings</label>
        <p style="font-size: var(--font-size-xs); color: var(--text-secondary); margin-bottom: 8px;">Select an object on the canvas to inspect its properties, or start drawing!</p>
      </div>
    `;
  }

  bindInspectorEvents(selectedObjs) {
    const delBtn = document.getElementById('btn-delete-selected');
    if (delBtn) {
      delBtn.onclick = () => {
        const page = state.getActivePage();
        if (page) {
          const cmd = new DeleteObjectsCommand(page, selectedObjs);
          history.execute(cmd);
          state.clearSelection();
        }
      };
    }

    this.panel.querySelectorAll('.color-swatch[data-prop]').forEach(swatch => {
      swatch.onclick = () => {
        const prop = swatch.getAttribute('data-prop');
        const val = swatch.getAttribute('data-val');
        const cmd = new PropertyChangeCommand(selectedObjs, prop, selectedObjs[0][prop], val);
        history.execute(cmd);
        this.render();
      };
    });

    const strokeRange = document.getElementById('inspector-stroke-width');
    if (strokeRange) {
      strokeRange.oninput = (e) => {
        const val = parseInt(e.target.value, 10);
        selectedObjs.forEach(o => { o.strokeWidth = val; });
        state.notify('canvas');
      };
      strokeRange.onchange = (e) => {
        const val = parseInt(e.target.value, 10);
        const cmd = new PropertyChangeCommand(selectedObjs, 'strokeWidth', selectedObjs[0].strokeWidth, val);
        history.execute(cmd);
      };
    }
  }
}
