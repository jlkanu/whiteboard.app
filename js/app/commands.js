/**
 * Command Manager & Undo / Redo Stack
 */

import { state } from './state.js';

class CommandHistory {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 100;
  }

  /**
   * Executes a command object with `execute()` and `undo()` methods.
   */
  execute(command) {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new action
    state.markDirty();
    this.notify();
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    if (!this.canUndo()) return;
    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);
    state.markDirty();
    this.notify();
  }

  redo() {
    if (!this.canRedo()) return;
    const command = this.redoStack.pop();
    command.execute();
    this.undoStack.push(command);
    state.markDirty();
    this.notify();
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  notify() {
    state.notify('history', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  }
}

export const history = new CommandHistory();

/**
 * Concrete Command Helpers
 */

export class AddObjectCommand {
  constructor(page, object) {
    this.page = page;
    this.object = object;
  }

  execute() {
    this.page.objects.push(this.object);
  }

  undo() {
    const idx = this.page.objects.findIndex(o => o.id === this.object.id);
    if (idx !== -1) {
      this.page.objects.splice(idx, 1);
    }
  }
}

export class DeleteObjectsCommand {
  constructor(page, objects) {
    this.page = page;
    this.objects = [...objects];
  }

  execute() {
    const ids = new Set(this.objects.map(o => o.id));
    this.page.objects = this.page.objects.filter(o => !ids.has(o.id));
  }

  undo() {
    this.objects.forEach(obj => {
      if (!this.page.objects.some(o => o.id === obj.id)) {
        this.page.objects.push(obj);
      }
    });
  }
}

export class TransformObjectsCommand {
  constructor(objects, beforeStates, afterStates) {
    this.objects = objects;
    this.beforeStates = beforeStates; // Map object.id -> state clone
    this.afterStates = afterStates;
  }

  execute() {
    this.objects.forEach(obj => {
      const after = this.afterStates[obj.id];
      if (after) Object.assign(obj, after);
    });
  }

  undo() {
    this.objects.forEach(obj => {
      const before = this.beforeStates[obj.id];
      if (before) Object.assign(obj, before);
    });
  }
}

export class PropertyChangeCommand {
  constructor(objects, propertyName, oldValue, newValue) {
    this.objects = objects;
    this.propertyName = propertyName;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }

  execute() {
    this.objects.forEach(obj => {
      obj[this.propertyName] = this.newValue;
    });
  }

  undo() {
    this.objects.forEach(obj => {
      obj[this.propertyName] = this.oldValue;
    });
  }
}
