import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

// 🔌 YOUR FRESH APPMOBILE CLOUD FIREBASE SERVERS CHANNELS KEYS
const firebaseConfig = {
  apiKey: "AIzaSyDwoXVlyu0DkNeEP9VK-E0Ul105vHMXydU",
  authDomain: "://firebaseapp.com",
  projectId: "uniformex-inventory-app",
  storageBucket: "uniformex-inventory-app.firebasestorage.app",
  messagingSenderId: "962236027572",
  appId: "1:962236027572:web:6fe1c280f1cd4acb6a3de1"
};

// Initialize Firebase App Instance
const app = initializeApp(firebaseConfig);

// Direct connector to your fresh database
export const db = getFirestore(app);

export const storage = getStorage(app);

// Structured Error Handling for Firestore Security Rules / Permissions
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
    providerInfo: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
