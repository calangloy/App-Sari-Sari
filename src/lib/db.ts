import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  QueryConstraint,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

const TENANT_COLLECTIONS = ['products', 'sales', 'suppliers', 'purchases', 'audit_log', 'settings'];

let activeStoreId: string | null = null;
const listeners = new Set<(storeId: string | null) => void>();

export const getGlobalStoreId = () => activeStoreId;

export const setGlobalStoreId = (storeId: string | null) => {
  activeStoreId = storeId;
  listeners.forEach(cb => cb(storeId));
};

export const addGlobalStoreIdListener = (cb: (storeId: string | null) => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const getScopedDocId = (collectionPath: string, docId: string, storeId: string | null) => {
  if (collectionPath === 'settings' && storeId) {
    return `${docId}_${storeId}`;
  }
  return docId;
};

export function useCollection<T>(collectionPath: string, ...queryConstraints: QueryConstraint[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState(getGlobalStoreId());

  useEffect(() => {
    const unsub = addGlobalStoreIdListener((id) => {
      setStoreId(id);
    });
    return unsub;
  }, []);

  useEffect(() => {
    setLoading(true);
    let constraints = [...queryConstraints];
    if (TENANT_COLLECTIONS.includes(collectionPath) && storeId) {
      constraints.push(where('storeId', '==', storeId));
    }
    const q = query(collection(db, collectionPath), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result: T[] = [];
      snapshot.forEach((doc) => {
        let id = doc.id;
        if (collectionPath === 'settings' && storeId && id.endsWith(`_${storeId}`)) {
          id = id.replace(`_${storeId}`, '');
        }
        result.push({ id, ...doc.data() } as T);
      });
      setData(result);
      setLoading(false);
    }, (err) => {
      console.error(`Collection error [${collectionPath}]:`, err);
      handleFirestoreError(err, OperationType.LIST, collectionPath);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionPath, storeId]);

  return { data, loading, error };
}

export const dbService = {
  async list(collectionPath: string) {
    try {
      const currentStoreId = getGlobalStoreId();
      let q = collection(db, collectionPath);
      let snap;
      if (TENANT_COLLECTIONS.includes(collectionPath) && currentStoreId) {
        const qRef = query(q, where('storeId', '==', currentStoreId));
        snap = await getDocs(qRef);
      } else {
        snap = await getDocs(q);
      }
      return snap.docs.map(doc => {
        let id = doc.id;
        if (collectionPath === 'settings' && currentStoreId && id.endsWith(`_${currentStoreId}`)) {
          id = id.replace(`_${currentStoreId}`, '');
        }
        return { id, ...doc.data() };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionPath);
      return [];
    }
  },

  async add(collectionPath: string, data: any) {
    try {
      const currentStoreId = getGlobalStoreId();
      const payload = { ...data };
      if (TENANT_COLLECTIONS.includes(collectionPath) && currentStoreId) {
        payload.storeId = currentStoreId;
      }
      return await addDoc(collection(db, collectionPath), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionPath);
    }
  },

  async update(collectionPath: string, id: string, data: any) {
    try {
      const currentStoreId = getGlobalStoreId();
      const payload = { ...data };
      if (TENANT_COLLECTIONS.includes(collectionPath) && currentStoreId) {
        payload.storeId = currentStoreId;
      }
      const actualDocId = getScopedDocId(collectionPath, id, currentStoreId);
      const docRef = doc(db, collectionPath, actualDocId);
      return await updateDoc(docRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionPath}/${id}`);
    }
  },

  async remove(collectionPath: string, id: string) {
    try {
      const currentStoreId = getGlobalStoreId();
      const actualDocId = getScopedDocId(collectionPath, id, currentStoreId);
      return await deleteDoc(doc(db, collectionPath, actualDocId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionPath}/${id}`);
    }
  },

  async set(collectionPath: string, id: string, data: any) {
    try {
      const currentStoreId = getGlobalStoreId();
      const payload = { ...data };
      if (TENANT_COLLECTIONS.includes(collectionPath) && currentStoreId) {
        payload.storeId = currentStoreId;
      }
      const actualDocId = getScopedDocId(collectionPath, id, currentStoreId);
      const docRef = doc(db, collectionPath, actualDocId);
      return await setDoc(docRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionPath}/${id}`);
    }
  }
};
