/**
 * IndexedDB Database Wrapper for Whiteboard.app
 * Manages persistent board documents and embedded binary assets (images).
 */

const DB_NAME = 'whiteboard_app_db';
const DB_VERSION = 1;
const STORE_BOARDS = 'boards';
const STORE_ASSETS = 'assets';

let dbPromise = null;

export function openDatabase() {
  if (dbPromise) return dbPromise;

  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_BOARDS)) {
        const boardStore = db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
        boardStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Saves or updates a board in IndexedDB.
 */
export async function saveBoardToDB(board) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_BOARDS], 'readwrite');
    const store = tx.objectStore(STORE_BOARDS);
    const request = store.put(board);

    request.onsuccess = () => resolve(board.id);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retrieves a board by ID.
 */
export async function getBoardFromDB(boardId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_BOARDS], 'readonly');
    const store = tx.objectStore(STORE_BOARDS);
    const request = store.get(boardId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Gets all saved boards sorted by updatedAt desc.
 */
export async function getAllBoardsFromDB() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_BOARDS], 'readonly');
    const store = tx.objectStore(STORE_BOARDS);
    const request = store.getAll();

    request.onsuccess = () => {
      const boards = request.result || [];
      boards.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      resolve(boards);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Deletes a board by ID.
 */
export async function deleteBoardFromDB(boardId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_BOARDS], 'readwrite');
    const store = tx.objectStore(STORE_BOARDS);
    const request = store.delete(boardId);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Saves a binary asset (image Blob / DataURL)
 */
export async function saveAssetToDB(assetId, data) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ASSETS], 'readwrite');
    const store = tx.objectStore(STORE_ASSETS);
    const request = store.put({ id: assetId, data, createdAt: Date.now() });

    request.onsuccess = () => resolve(assetId);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Gets an asset by ID.
 */
export async function getAssetFromDB(assetId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ASSETS], 'readonly');
    const store = tx.objectStore(STORE_ASSETS);
    const request = store.get(assetId);

    request.onsuccess = () => resolve(request.result ? request.result.data : null);
    request.onerror = (e) => reject(e.target.error);
  });
}
