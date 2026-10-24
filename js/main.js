/**
 * Main Application Entry Point
 * Wires together Topbar, Tool Dock, Inspector, Canvas, Persistence, and Dialogs.
 */

import { loadInitialBoard, saveBoardToDB } from './storage/persistence.js';
import { state } from './app/state.js';
import { Viewport } from './canvas/coordinates.js';
import { CanvasRenderer } from './canvas/renderer.js';
import { ToolManager } from './tools/tool-manager.js';
import { ToolbarController } from './ui/toolbar.js';
import { InspectorController } from './ui/inspector.js';
import { setupKeyboardShortcuts } from './app/shortcuts.js';
import { openBoardsModal } from './ui/boards.js';
import { applyTemplate } from './ui/templates.js';
import { exportPNG, exportSVG, exportJSON } from './documents/export.js';
import { importJSONFile } from './documents/import.js';
import { showToast } from './app/notifications.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing Whiteboard.app...');

  // 1. Initialize Canvas & Viewport
  const canvas = document.getElementById('main-canvas');
  const container = document.getElementById('canvas-container');
  if (!canvas || !container) return;

  const viewport = new Viewport();
  const renderer = new CanvasRenderer(canvas);
  const toolManager = new ToolManager(canvas, viewport);

  function handleResize() {
    const rect = container.getBoundingClientRect();
    viewport.updateDPR();
    renderer.resize(rect.width, rect.height, viewport.dpr);
    state.notify('canvas');
  }

  window.addEventListener('resize', handleResize);
  handleResize();

  // 2. Load Initial Document
  const doc = await loadInitialBoard();
  state.setDocument(doc);

  // 3. Initialize UI Controllers
  new ToolbarController();
  new InspectorController();
  setupKeyboardShortcuts(viewport);

  // 4. Render Loop
  function draw() {
    const activePage = state.getActivePage();
    const gridStyle = state.currentDocument ? state.currentDocument.settings.gridStyle : 'dots';

    renderer.render({
      viewport,
      page: activePage,
      gridStyle,
      selectedObjectIds: state.selectedObjectIds,
      activeDraft: toolManager.activeDraft,
      selectionRect: toolManager.selectionRect
    });
  }

  state.subscribe((event) => {
    if (event === 'canvas' || event === 'document' || event === 'selection' || event === 'toolProps') {
      draw();
    }
    if (event === 'document') {
      const titleInput = document.getElementById('board-title-input');
      if (titleInput && state.currentDocument) {
        titleInput.value = state.currentDocument.title;
      }
    }
  });

  draw();

  // 5. Header Bar Interactions
  const titleInput = document.getElementById('board-title-input');
  if (titleInput) {
    titleInput.addEventListener('change', () => {
      if (state.currentDocument) {
        state.currentDocument.title = titleInput.value.trim() || 'Untitled Board';
        state.markDirty();
      }
    });
  }

  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');

  state.subscribe((event, data) => {
    if (event === 'history' && data) {
      if (btnUndo) btnUndo.disabled = !data.canUndo;
      if (btnRedo) btnRedo.disabled = !data.canRedo;
    }
  });

  if (btnUndo) btnUndo.onclick = () => import('./app/commands.js').then(m => m.history.undo());
  if (btnRedo) btnRedo.onclick = () => import('./app/commands.js').then(m => m.history.redo());

  // Save status indicator update
  state.subscribe((event) => {
    if (event === 'saveStatus') {
      const statusText = document.querySelector('.status-text');
      const statusDot = document.querySelector('.status-dot');
      if (statusText && statusDot) {
        if (state.saveStatus === 'saving') {
          statusText.textContent = 'Saving...';
          statusDot.className = 'status-dot saving';
        } else if (state.saveStatus === 'saved') {
          statusText.textContent = 'Saved locally';
          statusDot.className = 'status-dot';
        } else {
          statusText.textContent = 'Save failed';
          statusDot.className = 'status-dot error';
        }
      }
    }
  });

  // Boards Modal
  const btnBoards = document.getElementById('btn-boards');
  if (btnBoards) btnBoards.onclick = () => openBoardsModal();

  // Templates Chooser
  const btnTemplates = document.getElementById('btn-templates');
  if (btnTemplates) {
    btnTemplates.onclick = () => {
      const templateKeys = ['blank', 'lesson-plan', 'mind-map', 'flowchart', 'brainstorming', 'coordinate', 'ruled'];
      const chosen = prompt(`Choose Template:\n${templateKeys.join('\n')}`, 'lesson-plan');
      if (chosen && templateKeys.includes(chosen.toLowerCase().trim())) {
        applyTemplate(chosen.toLowerCase().trim());
      }
    };
  }

  // Export Menu
  const btnExport = document.getElementById('btn-export-menu');
  if (btnExport) {
    btnExport.onclick = () => {
      const mode = prompt('Export Format:\n1. PNG Image\n2. SVG Vector\n3. JSON Backup File', '1');
      const page = state.getActivePage();
      if (mode === '1') exportPNG(page, state.currentDocument.settings.gridStyle);
      else if (mode === '2') exportSVG(page);
      else if (mode === '3') exportJSON(state.currentDocument);
    };
  }

  // Theme Toggle
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      state.notify('canvas');
      showToast(`Switched to ${next} theme`, 'info');
    };
  }

  // Presentation Mode Toggle
  const btnPresentation = document.getElementById('btn-presentation');
  if (btnPresentation) {
    btnPresentation.onclick = () => {
      state.isPresentationMode = !state.isPresentationMode;
      document.querySelector('.app-header').style.display = state.isPresentationMode ? 'none' : 'flex';
      document.getElementById('tool-dock').style.display = state.isPresentationMode ? 'none' : 'flex';
      document.getElementById('inspector-panel').style.display = state.isPresentationMode ? 'none' : 'block';
      handleResize();
      showToast(state.isPresentationMode ? 'Entered presentation mode (Esc to exit)' : 'Exited presentation mode', 'info');
    };
  }

  // Bottom Controls (Zoom & Grid)
  const zoomVal = document.getElementById('zoom-value');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnFitView = document.getElementById('btn-fit-view');
  const btnResetView = document.getElementById('btn-reset-view');
  const gridSelect = document.getElementById('grid-selector');

  const updateZoomUI = () => {
    if (zoomVal) zoomVal.textContent = `${Math.round(viewport.zoom * 100)}%`;
  };

  if (btnZoomIn) {
    btnZoomIn.onclick = () => {
      viewport.zoom = Math.min(5.0, viewport.zoom * 1.15);
      updateZoomUI();
      draw();
    };
  }

  if (btnZoomOut) {
    btnZoomOut.onclick = () => {
      viewport.zoom = Math.max(0.1, viewport.zoom * 0.85);
      updateZoomUI();
      draw();
    };
  }

  if (btnResetView) {
    btnResetView.onclick = () => {
      viewport.zoom = 1.0;
      viewport.x = 0;
      viewport.y = 0;
      updateZoomUI();
      draw();
    };
  }

  if (btnFitView) {
    btnFitView.onclick = () => {
      const page = state.getActivePage();
      if (page && page.objects.length > 0) {
        import('./canvas/hit-testing.js').then(m => {
          const bounds = m.getCombinedBounds(page.objects);
          const rect = container.getBoundingClientRect();
          const scaleX = (rect.width - 100) / bounds.width;
          const scaleY = (rect.height - 100) / bounds.height;
          viewport.zoom = Math.min(2.0, Math.max(0.2, Math.min(scaleX, scaleY)));
          viewport.x = (rect.width - bounds.width * viewport.zoom) / 2 - bounds.x * viewport.zoom;
          viewport.y = (rect.height - bounds.height * viewport.zoom) / 2 - bounds.y * viewport.zoom;
          updateZoomUI();
          draw();
        });
      }
    };
  }

  if (gridSelect) {
    gridSelect.value = state.currentDocument ? state.currentDocument.settings.gridStyle : 'dots';
    gridSelect.onchange = (e) => {
      if (state.currentDocument) {
        state.currentDocument.settings.gridStyle = e.target.value;
        state.markDirty();
      }
    };
  }

  showToast('Whiteboard ready!', 'success');
});
