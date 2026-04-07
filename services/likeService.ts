
import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, onSnapshot, serverTimestamp, increment } from 'firebase/firestore';
import type { Like } from '../types';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

export const toggleLike = async (userId: string, projectId: string): Promise<boolean> => {
  const path = 'likes';
  try {
    const likesRef = collection(db, path);
    const likeId = `${userId}_${projectId}`;
    const likeDocRef = doc(db, path, likeId);
    const projectDocRef = doc(db, 'projects', projectId);
    
    const q = query(likesRef, where('userId', '==', userId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);

    if (!snapshot.empty) {
      // Already liked, remove it
      batch.delete(likeDocRef);
      batch.update(projectDocRef, {
        likes: increment(-1)
      });
      await batch.commit();
      return false; // Not liked anymore
    } else {
      // Not liked, add it
      batch.set(likeDocRef, {
        userId,
        projectId,
        timestamp: serverTimestamp()
      });
      batch.update(projectDocRef, {
        likes: increment(1)
      });
      await batch.commit();
      return true; // Liked now
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false; // Should not reach here
  }
};

export const subscribeToLikes = (userId: string, callback: (likes: Like[]) => void) => {
  const path = 'likes';
  const likesRef = collection(db, path);
  const q = query(likesRef, where('userId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const likes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Like));
    callback(likes);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};
