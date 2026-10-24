/**
 * Import Pipeline (JSON Document Parsing & Validation)
 */

import { SCHEMA_VERSION } from './schema.js';
import { saveBoardToDB } from '../storage/database.js';
import { state } from '../app/state.js';
import { setLastActiveBoardId } from '../storage/persistence.js';
import { showToast } from '../app/notifications.js';

export function importJSONFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const doc = JSON.parse(e.target.result);
      if (!validateDocumentSchema(doc)) {
        showToast('Invalid document format or missing required fields', 'error');
        return;
      }

      // Re-assign new board ID to prevent collisions if imported twice
      doc.id = `board_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      doc.updatedAt = Date.now();

      await saveBoardToDB(doc);
      setLastActiveBoardId(doc.id);
      state.setDocument(doc);
      showToast(`Imported ${doc.title} successfully!`, 'success');
    } catch (err) {
      console.error('Import parse error:', err);
      showToast('Failed to parse board file', 'error');
    }
  };
  reader.readAsText(file);
}

export function validateDocumentSchema(doc) {
  if (!doc || typeof doc !== 'object') return false;
  if (!doc.version || !doc.title || !Array.isArray(doc.pages)) return false;
  if (doc.pages.length === 0) return false;

  const validPage = doc.pages.every(p => p.id && p.name && Array.isArray(p.objects));
  return validPage;
}
