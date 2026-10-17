import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocs, 
  onSnapshot, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { Asset, TransferRequest, ResponsibilityTerm, TrashedAsset, AssetExit } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Use custom database ID if present, otherwise default
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (
      error?.code === 'resource-exhausted' ||
      error?.code === 'unavailable' ||
      error?.message?.includes('Quota') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('offline')
    ) {
      console.warn("Firebase indisponível ou cota excedida:", error.message || error.code);
      return false;
    }
    // Se for erro de documento não existente, significa que a conexão está ativa
    return true;
  }
}

/**
 * Real-time listener for Assets collection
 */
export function subscribeToAssets(callback: (assets: Asset[]) => void, onError?: (err: any) => void) {
  const colRef = collection(db, 'assets');
  return onSnapshot(colRef, (snapshot) => {
    const list: Asset[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as Asset);
    });
    callback(list);
  }, (err) => {
    console.warn("Firestore assets subscribe error:", err);
    onError?.(err);
  });
}

/**
 * Real-time listener for Transfers collection
 */
export function subscribeToTransfers(callback: (transfers: TransferRequest[]) => void) {
  const colRef = collection(db, 'transfers');
  return onSnapshot(colRef, (snapshot) => {
    const list: TransferRequest[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as TransferRequest);
    });
    callback(list);
  }, (err) => {
    console.warn("Firestore transfers subscribe error:", err);
  });
}

/**
 * Real-time listener for Responsibility Terms collection
 */
export function subscribeToTerms(callback: (terms: ResponsibilityTerm[]) => void) {
  const colRef = collection(db, 'terms');
  return onSnapshot(colRef, (snapshot) => {
    const list: ResponsibilityTerm[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as ResponsibilityTerm);
    });
    callback(list);
  }, (err) => {
    console.warn("Firestore terms subscribe error:", err);
  });
}

/**
 * Remove campos undefined para evitar erros no Firestore
 */
function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData) as any;
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeFirestoreData(value);
    }
  }
  return clean;
}

/**
 * Save or update single asset in Firestore
 */
export async function saveAssetToFirestore(asset: Asset): Promise<void> {
  const ref = doc(db, 'assets', asset.id);
  const cleanAsset = sanitizeFirestoreData(asset);
  await setDoc(ref, cleanAsset, { merge: true });
}

/**
 * Batch save assets into Firestore (chunked in batches of 450 to respect Firestore 500 limit)
 */
export async function batchSaveAssetsToFirestore(assets: Asset[]): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < assets.length; i += CHUNK_SIZE) {
    const chunk = assets.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const asset of chunk) {
      const ref = doc(db, 'assets', asset.id);
      const cleanAsset = sanitizeFirestoreData(asset);
      batch.set(ref, cleanAsset, { merge: true });
    }
    await batch.commit();
  }
}

/**
 * Save transfer request in Firestore
 */
export async function saveTransferToFirestore(transfer: TransferRequest): Promise<void> {
  const ref = doc(db, 'transfers', transfer.id);
  await setDoc(ref, transfer, { merge: true });
}

/**
 * Save responsibility term in Firestore
 */
export async function saveTermToFirestore(term: ResponsibilityTerm): Promise<void> {
  const ref = doc(db, 'terms', term.id);
  await setDoc(ref, term, { merge: true });
}

export async function deleteTermFromFirestore(termId: string): Promise<void> {
  const ref = doc(db, 'terms', termId);
  await deleteDoc(ref);
}

/**
 * Fetch all assets from Firestore once
 */
export async function fetchAllAssetsFromFirestore(): Promise<Asset[]> {
  const colRef = collection(db, 'assets');
  const snap = await getDocs(colRef);
  const list: Asset[] = [];
  snap.forEach(d => list.push(d.data() as Asset));
  return list;
}

/**
 * Delete a single asset from Firestore
 */
export async function deleteAssetFromFirestore(assetId: string): Promise<void> {
  const ref = doc(db, 'assets', assetId);
  await deleteDoc(ref);
}

/**
 * Delete all assets from Firestore collection in batches of 400
 */
export async function clearAllAssetsFromFirestore(): Promise<void> {
  const colRef = collection(db, 'assets');
  const snap = await getDocs(colRef);
  const docs = snap.docs;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }
}

export async function batchReplaceAssetsInFirestore(newAssets: Asset[]): Promise<void> {
  await clearAllAssetsFromFirestore();
  if (newAssets.length > 0) {
    await batchSaveAssetsToFirestore(newAssets);
  }
}

export async function saveTrashedAssetToFirestore(item: TrashedAsset): Promise<void> {
  const ref = doc(db, 'trash_assets', item.asset.id);
  await setDoc(ref, item);
}

export async function deleteTrashedAssetFromFirestore(assetId: string): Promise<void> {
  const ref = doc(db, 'trash_assets', assetId);
  await deleteDoc(ref);
}

export async function fetchAllTrashedAssetsFromFirestore(): Promise<TrashedAsset[]> {
  try {
    const colRef = collection(db, 'trash_assets');
    const snap = await getDocs(colRef);
    const list: TrashedAsset[] = [];
    snap.forEach(d => list.push(d.data() as TrashedAsset));
    return list;
  } catch (err) {
    console.warn('Error fetching trashed assets from Firestore:', err);
    return [];
  }
}

export async function saveExitToFirestore(item: AssetExit): Promise<void> {
  const ref = doc(db, 'asset_exits', item.id);
  const cleanItem = sanitizeFirestoreData(item);
  await setDoc(ref, cleanItem, { merge: true });
}

export async function deleteExitFromFirestore(exitId: string): Promise<void> {
  const ref = doc(db, 'asset_exits', exitId);
  await deleteDoc(ref);
}

export async function fetchAllExitsFromFirestore(): Promise<AssetExit[]> {
  try {
    const colRef = collection(db, 'asset_exits');
    const snap = await getDocs(colRef);
    const list: AssetExit[] = [];
    snap.forEach(d => list.push(d.data() as AssetExit));
    return list;
  } catch (err) {
    console.warn('Error fetching exits from Firestore:', err);
    return [];
  }
}

