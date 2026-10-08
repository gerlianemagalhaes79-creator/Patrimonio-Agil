import { Asset, TransferRequest, ResponsibilityTerm } from '../types';

const DB_NAME = 'cpsms_patrimonio_db';
const DB_VERSION = 1;
const STORE_ASSETS = 'assets';
const STORE_TRANSFERS = 'transfers';
const STORE_TERMS = 'terms';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TRANSFERS)) {
        db.createObjectStore(STORE_TRANSFERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TERMS)) {
        db.createObjectStore(STORE_TERMS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAssetsToDB(assets: Asset[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_ASSETS, 'readwrite');
    const store = tx.objectStore(STORE_ASSETS);
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const asset of assets) {
      store.put(asset);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Fallback saving to localStorage due to IndexedDB error:', err);
    try {
      localStorage.setItem('patrimonio_cpsms_assets_v2', JSON.stringify(assets.slice(0, 1500)));
    } catch (e) {
      console.error('LocalStorage quota exceeded:', e);
    }
  }
}

export async function loadAssetsFromDB(): Promise<Asset[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_ASSETS, 'readonly');
    const store = tx.objectStore(STORE_ASSETS);
    return new Promise<Asset[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Fallback loading from localStorage:', err);
    const saved = localStorage.getItem('patrimonio_cpsms_assets_v2');
    return saved ? JSON.parse(saved) : [];
  }
}

export async function saveTransfersToDB(transfers: TransferRequest[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_TRANSFERS, 'readwrite');
    const store = tx.objectStore(STORE_TRANSFERS);
    store.clear();
    for (const tr of transfers) {
      store.put(tr);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    localStorage.setItem('patrimonio_cpsms_transfers_v2', JSON.stringify(transfers));
  }
}

export async function loadTransfersFromDB(): Promise<TransferRequest[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_TRANSFERS, 'readonly');
    const store = tx.objectStore(STORE_TRANSFERS);
    return new Promise<TransferRequest[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    const saved = localStorage.getItem('patrimonio_cpsms_transfers_v2');
    return saved ? JSON.parse(saved) : [];
  }
}

export async function saveTermsToDB(terms: ResponsibilityTerm[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_TERMS, 'readwrite');
    const store = tx.objectStore(STORE_TERMS);
    store.clear();
    for (const term of terms) {
      store.put(term);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    localStorage.setItem('patrimonio_cpsms_terms_v2', JSON.stringify(terms));
  }
}

export async function loadTermsFromDB(): Promise<ResponsibilityTerm[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_TERMS, 'readonly');
    const store = tx.objectStore(STORE_TERMS);
    return new Promise<ResponsibilityTerm[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    const saved = localStorage.getItem('patrimonio_cpsms_terms_v2');
    return saved ? JSON.parse(saved) : [];
  }
}

export async function clearAllDB(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_ASSETS, STORE_TRANSFERS, STORE_TERMS], 'readwrite');
    tx.objectStore(STORE_ASSETS).clear();
    tx.objectStore(STORE_TRANSFERS).clear();
    tx.objectStore(STORE_TERMS).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Error clearing IndexedDB:', e);
  }
  localStorage.removeItem('patrimonio_cpsms_assets_v2');
  localStorage.removeItem('patrimonio_cpsms_transfers_v2');
  localStorage.removeItem('patrimonio_cpsms_terms_v2');
}
