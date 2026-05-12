
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { User } from 'firebase/auth';

export const APP_VERSION = '1.0.6';

export const logAudit = async (action: string, details: string, userOverride?: User | null) => {
    if (action !== 'LOGIN') {
        return;
    }

    const user = userOverride !== undefined ? userOverride : auth.currentUser;
    if (!user) return;

    try {
        await addDoc(collection(db, 'auditLogs'), {
            userEmail: user.email,
            action,
            details,
            version: APP_VERSION,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error logging audit:", error);
    }
};
