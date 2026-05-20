import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore';

// In AI Studio, this file is generated after set_up_firebase
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Helper to create users without signing out the current admin
export const createInternalAuthUser = async (username: string, password: string) => {
  const email = `${username.toLowerCase().trim()}@sarisari.pos`;
  const secondaryAppName = `Secondary-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return userCredential.user.uid;
  } finally {
    // Delete the secondary app instance to clean up
    await deleteApp(secondaryApp);
  }
};

// Helper to update another user's password securely safely by authenticating secondary app
export const updateInternalAuthUserPassword = async (username: string, oldPassword: string, newPassword: string) => {
  const email = `${username.toLowerCase().trim()}@sarisari.pos`;
  const secondaryAppName = `Update-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    try {
      await signInWithEmailAndPassword(secondaryAuth, email, oldPassword);
    } catch (err) {
      // If oldPassword doc was out of sync, try '1234' or original fallback 'Admin1234'
      if (oldPassword !== '1234') {
        try {
          await signInWithEmailAndPassword(secondaryAuth, email, '1234');
        } catch (err2) {
          await signInWithEmailAndPassword(secondaryAuth, email, 'Admin1234');
        }
      } else {
        try {
          await signInWithEmailAndPassword(secondaryAuth, email, 'Admin1234');
        } catch (err3) {
          throw err;
        }
      }
    }
    
    if (secondaryAuth.currentUser) {
      await updatePassword(secondaryAuth.currentUser, newPassword);
    }
  } finally {
    await deleteApp(secondaryApp);
  }
};

// Connection test as per skill
const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
};
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { db, auth };
