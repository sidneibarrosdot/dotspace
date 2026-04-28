
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import type { Favorite } from '../types';

export const toggleFavorite = async (userId: string, projectId: string): Promise<boolean> => {
  try {
    const favoritesRef = collection(db, 'favorites');
    const q = query(favoritesRef, where('userId', '==', userId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Already favorited, remove it
      const favoriteDoc = snapshot.docs[0];
      await deleteDoc(doc(db, 'favorites', favoriteDoc.id));
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
    console.error('Error toggling favorite:', error);
    throw error;
  }
};

export const subscribeToFavorites = (userId: string, callback: (favorites: Favorite[]) => void) => {
  const favoritesRef = collection(db, 'favorites');
  const q = query(favoritesRef, where('userId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const favorites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Favorite));
    callback(favorites);
  });
};
