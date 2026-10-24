/**
 * Persistence Manager
 * Handles debounced autosaving, last active board tracking, and fallback localStorage options.
 */

import { saveBoardToDB, getBoardFromDB, getAllBoardsFromDB } from './database.js';
import { createDocument } from '../documents/schema.js';

export { saveBoardToDB, getBoardFromDB, getAllBoardsFromDB };

const LAST_BOARD_KEY = 'whiteboard_last_active_board';
const DEBOUNCE_DELAY = 1000;

let autosaveTimer = null;

/**
 * Returns the last opened board ID or null.
 */
export function getLastActiveBoardId() {
  try {
    return localStorage.getItem(LAST_BOARD_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Sets the last active board ID.
 */
export function setLastActiveBoardId(boardId) {
  try {
    localStorage.setItem(LAST_BOARD_KEY, boardId);
  } catch (e) {
    console.warn('localStorage unavailable', e);
  }
}

/**
 * Loads the active board or creates a default new document.
 */
export async function loadInitialBoard() {
  const lastId = getLastActiveBoardId();
  if (lastId) {
    try {
      const board = await getBoardFromDB(lastId);
      if (board) return board;
    } catch (e) {
      console.error('Failed to load last board from DB:', e);
    }
  }

  // Fallback: check if any boards exist
  try {
    const boards = await getAllBoardsFromDB();
    if (boards.length > 0) {
      setLastActiveBoardId(boards[0].id);
      return boards[0];
    }
  } catch (e) {
    console.error('Failed to query boards from DB:', e);
  }

  // Create brand new initial document
  const newDoc = createDocument('Welcome Whiteboard');
  try {
    await saveBoardToDB(newDoc);
  } catch (e) {
    console.warn('Could not save initial doc to IndexedDB:', e);
  }
  setLastActiveBoardId(newDoc.id);
  return newDoc;
}

/**
 * Schedules debounced autosave with status callbacks.
 */
export function scheduleAutosave(document, onStatusChange) {
  if (onStatusChange) onStatusChange('saving');

  if (autosaveTimer) clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(async () => {
    try {
      document.updatedAt = Date.now();
      await saveBoardToDB(document);
      setLastActiveBoardId(document.id);
      if (onStatusChange) onStatusChange('saved');
    } catch (e) {
      console.error('Autosave failed:', e);
      if (onStatusChange) onStatusChange('error');
    }
  }, DEBOUNCE_DELAY);
}
