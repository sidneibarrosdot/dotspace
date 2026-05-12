
import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, onSnapshot, serverTimestamp, increment } from 'firebase/firestore';
import type { Like } from '../types';

export const toggleLike = async (userId: string, projectId: string): Promise<boolean> => {
  try {
    const likesRef = collection(db, 'likes');
    const likeId = `${userId}_${projectId}`;
    const likeDocRef = doc(db, 'likes', likeId);
    const projectDocRef = doc(db, 'projects', projectId);
    
    const q = query(likesRef, where('userId', '==', userId), where('projectId', '==', projectId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);

    if (!snapshot.empty) {
      const matchingDocs = snapshot.docs;
      matchingDocs.forEach((likeDoc) => batch.delete(likeDoc.ref));
      batch.update(projectDocRef, {
        likes: increment(-matchingDocs.length)
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
    console.error('Error toggling like:', error);
    throw error;
  }
};

export const subscribeToLikes = (userId: string, callback: (likes: Like[]) => void) => {
  const likesRef = collection(db, 'likes');
  const q = query(likesRef, where('userId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const likes = snapshot.docs.reduce<Like[]>((acc, likeDoc) => {
      const data = likeDoc.data() as Like;
      const projectId = String(data.projectId || '').trim();
      if (!projectId) return acc;

      const existing = acc.find(item => item.projectId === projectId);
      if (existing) return acc;

      acc.push({
        id: likeDoc.id,
        ...data,
        projectId,
      });
      return acc;
    }, []);
    callback(likes);
  });
};
