/**
 * Central Reactive Application State
 */

import { scheduleAutosave } from '../storage/persistence.js';

class AppState {
  constructor() {
    this.currentDocument = null;
    this.activePageId = null;
    this.activeTool = 'select'; // 'select', 'hand', 'pen', 'pencil', 'highlighter', 'eraser', 'line', 'arrow', 'connector', 'rectangle', 'ellipse', 'triangle', 'diamond', 'text', 'sticky', 'image'

    this.selectedObjectIds = [];

    // Default tool properties
    this.toolProps = {
      strokeColor: '#172033',
      strokeWidth: 2,
      strokeStyle: 'solid', // 'solid' | 'dashed'
      fillColor: 'transparent',
      opacity: 1,
      fontSize: 20,
      fontFamily: 'sans-serif',
      textColor: '#172033',
      stickyColor: '#FEF08A',
      highlighterColor: 'rgba(253, 224, 71, 0.5)',
      highlighterWidth: 20
    };

    // UI state
    this.saveStatus = 'saved'; // 'saved' | 'saving' | 'error'
    this.isPresentationMode = false;
    this.theme = 'light';

    this.listeners = new Set();
  }

  /**
   * Initializes application state with document data.
   */
  setDocument(doc) {
    this.currentDocument = doc;
    this.activePageId = doc.activePageId || (doc.pages[0] ? doc.pages[0].id : null);
    this.selectedObjectIds = [];
    this.notify('document');
  }

  getActivePage() {
    if (!this.currentDocument || !this.currentDocument.pages) return null;
    return this.currentDocument.pages.find(p => p.id === this.activePageId) || this.currentDocument.pages[0];
  }

  getActiveObjects() {
    const page = this.getActivePage();
    if (!page) return [];
    return page.objects;
  }

  setActiveTool(toolName) {
    if (this.activeTool === toolName) return;
    this.activeTool = toolName;
    if (toolName !== 'select') {
      this.clearSelection();
    }
    this.notify('tool');
  }

  setSelectedObjectIds(ids) {
    this.selectedObjectIds = Array.isArray(ids) ? ids : [ids];
    this.notify('selection');
  }

  clearSelection() {
    if (this.selectedObjectIds.length > 0) {
      this.selectedObjectIds = [];
      this.notify('selection');
    }
  }

  updateToolProps(newProps) {
    this.toolProps = { ...this.toolProps, ...newProps };
    this.notify('toolProps');
  }

  setSaveStatus(status) {
    this.saveStatus = status;
    this.notify('saveStatus');
  }

  /**
   * Triggers autosave and notifies subscribers.
   */
  markDirty() {
    if (this.currentDocument) {
      scheduleAutosave(this.currentDocument, (status) => {
        this.setSaveStatus(status);
      });
    }
    this.notify('canvas');
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data) {
    this.listeners.forEach(fn => fn(event, data));
  }
}

export const state = new AppState();
