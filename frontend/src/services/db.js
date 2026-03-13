import { openDB } from 'idb';

const DB_NAME = 'GramSwasthDB';
const DB_VERSION = 1;

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for consultations
      if (!db.objectStoreNames.contains('consultations')) {
        db.createObjectStore('consultations', { keyPath: 'id' });
      }
      // Store for prescriptions
      if (!db.objectStoreNames.contains('prescriptions')) {
        db.createObjectStore('prescriptions', { keyPath: 'id' });
      }
      // Store for sync queue (actions to perform when back online)
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      }
      // Store for user profile / session
      if (!db.objectStoreNames.contains('user_data')) {
        db.createObjectStore('user_data', { keyPath: 'key' });
      }
    },
  });
};

export const offlineDB = {
  // Generic save
  save: async (storeName, data) => {
    const db = await initDB();
    if (Array.isArray(data)) {
      const tx = db.transaction(storeName, 'readwrite');
      await Promise.all([
        ...data.map(item => tx.store.put(item)),
        tx.done
      ]);
    } else {
      await db.put(storeName, data);
    }
  },

  // Generic getAll
  getAll: async (storeName) => {
    const db = await initDB();
    return db.getAll(storeName);
  },

  // Generic getById
  getById: async (storeName, id) => {
    const db = await initDB();
    return db.get(storeName, id);
  },

  // Queue an action for sync
  queueAction: async (action) => {
    const db = await initDB();
    return db.add('sync_queue', {
      ...action,
      timestamp: Date.now(),
      status: 'pending'
    });
  },

  // Get all pending actions
  getSyncQueue: async () => {
    const db = await initDB();
    return db.getAll('sync_queue');
  },

  // Remove from queue after success
  removeFromQueue: async (id) => {
    const db = await initDB();
    return db.delete('sync_queue', id);
  }
};
