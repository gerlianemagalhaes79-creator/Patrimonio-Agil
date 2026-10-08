import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { Asset, TransferRequest, ResponsibilityTerm } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Use custom database ID if present, otherwise default
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test as required by Firebase skill
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client offline:", error.message);
      return false;
    }
    // Document not existing is normal and means server responded
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
 * Save or update single asset in Firestore
 */
export async function saveAssetToFirestore(asset: Asset): Promise<void> {
  const ref = doc(db, 'assets', asset.id);
  await setDoc(ref, asset, { merge: true });
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
      batch.set(ref, asset, { merge: true });
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
