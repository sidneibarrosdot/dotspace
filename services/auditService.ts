
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

import { User } from 'firebase/auth';

export const APP_VERSION = '1.0.6';

export const logAudit = async (action: string, details: string, userOverride?: User | null) => {
    const user = userOverride !== undefined ? userOverride : auth.currentUser;
    if (!user) return;

    const path = 'auditLogs';
    try {
        await addDoc(collection(db, path), {
            userEmail: user.email,
            action,
            details,
            version: APP_VERSION,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};
