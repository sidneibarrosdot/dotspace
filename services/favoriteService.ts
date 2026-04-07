
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import type { Favorite } from '../types';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

export const toggleFavorite = async (userId: string, projectId: string): Promise<boolean> => {
  const path = 'favorites';
  try {
    const favoritesRef = collection(db, path);
    const q = query(favoritesRef, where('userId', '==', userId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Already favorited, remove it
      const favoriteDoc = snapshot.docs[0];
      await deleteDoc(doc(db, path, favoriteDoc.id));
      return false; // Not favorited anymore
    } else {
      // Not favorited, add it
      await addDoc(favoritesRef, {
        userId,
        projectId,
        timestamp: new Date().toISOString()
      });
      return true; // Favorited now
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false; // Should not reach here
  }
};

export const subscribeToFavorites = (userId: string, callback: (favorites: Favorite[]) => void) => {
  const path = 'favorites';
  const favoritesRef = collection(db, path);
  const q = query(favoritesRef, where('userId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const favorites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Favorite));
    callback(favorites);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};
