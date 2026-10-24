/**
 * Boards Management Dialog Controller
 */

import { getAllBoardsFromDB, saveBoardToDB, deleteBoardFromDB } from '../storage/database.js';
import { createDocument } from '../documents/schema.js';
import { state } from '../app/state.js';
import { setLastActiveBoardId } from '../storage/persistence.js';
import { showToast } from '../app/notifications.js';

export async function openBoardsModal() {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const boards = await getAllBoardsFromDB();

  container.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h2 class="modal-title">Your Boards</h2>
        <button id="modal-close" class="btn btn-icon sm btn-subtle">&times;</button>
      </div>
      <div class="modal-body">
        <div style="display:flex; justify-content: space-between; margin-bottom: 16px;">
          <button id="btn-create-new-board" class="btn btn-primary">+ New Board</button>
        </div>
        <div class="board-list" style="display:flex; flex-direction:column; gap:8px;">
          ${boards.map(b => `
            <div class="board-item" style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--bg-surface-hover); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
              <div>
                <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(b.title)}</div>
                <div style="font-size:var(--font-size-xs); color:var(--text-secondary);">Updated: ${new Date(b.updatedAt || Date.now()).toLocaleDateString()}</div>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-subtle sm btn-open-board" data-id="${b.id}">Open</button>
                <button class="btn btn-subtle sm btn-delete-board" data-id="${b.id}" style="color:var(--danger);">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  container.classList.add('open');

  container.querySelector('#modal-close').onclick = () => container.classList.remove('open');

  container.querySelector('#btn-create-new-board').onclick = async () => {
    const newDoc = createDocument('Untitled Board');
    await saveBoardToDB(newDoc);
    setLastActiveBoardId(newDoc.id);
    state.setDocument(newDoc);
    container.classList.remove('open');
    showToast('Created new board', 'success');
  };

  container.querySelectorAll('.btn-open-board').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      const b = boards.find(x => x.id === id);
      if (b) {
        setLastActiveBoardId(b.id);
        state.setDocument(b);
        container.classList.remove('open');
        showToast(`Opened ${b.title}`, 'success');
      }
    };
  });

  container.querySelectorAll('.btn-delete-board').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this board?')) {
        await deleteBoardFromDB(id);
        openBoardsModal(); // Refresh modal
      }
    };
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
