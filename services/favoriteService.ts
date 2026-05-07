import { db } from '../firebase';
import { collection, query, where, getDocs, getDoc, addDoc, deleteDoc, doc, onSnapshot, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import type { FavoriteList } from '../types';

const FAVORITE_LISTS_COLLECTION = 'favoriteLists';
const LEGACY_FAVORITES_COLLECTION = 'favorites';
const DEFAULT_FAVORITE_LIST_NAME = 'Favoritos';

const dedupe = (values: string[]) => [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
const normalizeName = (name: string) => name.trim().toLowerCase();

const getFavoriteListDoc = async (listId: string) => {
  return getDoc(doc(db, FAVORITE_LISTS_COLLECTION, listId));
};

const cleanupDuplicateFavoriteLists = async (lists: FavoriteList[]) => {
  const grouped = lists.reduce<Record<string, FavoriteList[]>>((acc, list) => {
    const key = normalizeName(list.name);
    acc[key] = acc[key] || [];
    acc[key].push(list);
    return acc;
  }, {});

  const duplicates = Object.values(grouped).filter(group => group.length > 1);
  if (duplicates.length === 0) return;

  const batch = writeBatch(db);

  duplicates.forEach(group => {
    const [keeper, ...rest] = group;
    const mergedProjectIds = dedupe(group.flatMap(list => list.projectIds || []));

    batch.update(doc(db, FAVORITE_LISTS_COLLECTION, keeper.id), {
      projectIds: mergedProjectIds,
      updatedAt: Timestamp.now(),
    });

    rest.forEach(list => {
      batch.delete(doc(db, FAVORITE_LISTS_COLLECTION, list.id));
    });
  });

  await batch.commit();
};

export const subscribeToFavoriteLists = (userId: string, callback: (lists: FavoriteList[]) => void) => {
  const favoriteListsRef = collection(db, FAVORITE_LISTS_COLLECTION);
  const q = query(favoriteListsRef, where('userId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const favoriteLists = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FavoriteList))
      .reduce<FavoriteList[]>((acc, list) => {
        const existing = acc.find(item => normalizeName(item.name) === normalizeName(list.name));
        if (!existing) {
          acc.push({
            ...list,
            projectIds: dedupe(list.projectIds || []),
          });
          return acc;
        }

        existing.projectIds = dedupe([...(existing.projectIds || []), ...(list.projectIds || [])]);
        return acc;
      }, [])
      .sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      });

    callback(favoriteLists);
    void cleanupDuplicateFavoriteLists(favoriteLists).catch((error) => {
      console.error('Error cleaning up duplicate favorite lists:', error);
    });
  });
};

export const ensureFavoriteListsReady = async (userId: string) => {
  const favoriteListsRef = collection(db, FAVORITE_LISTS_COLLECTION);
  const q = query(favoriteListsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return;
  }

  const legacyFavoritesRef = collection(db, LEGACY_FAVORITES_COLLECTION);
  const legacyQuery = query(legacyFavoritesRef, where('userId', '==', userId));
  const legacySnapshot = await getDocs(legacyQuery);
  const legacyProjectIds = dedupe(legacySnapshot.docs.map(doc => String(doc.data().projectId || '')));

  await addDoc(favoriteListsRef, {
    userId,
    name: DEFAULT_FAVORITE_LIST_NAME,
    projectIds: legacyProjectIds,
    isDefault: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

export const createFavoriteList = async (userId: string, name: string) => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Favorite list name is required');
  }

  const favoriteListsRef = collection(db, FAVORITE_LISTS_COLLECTION);
  const existingSnapshot = await getDocs(query(favoriteListsRef, where('userId', '==', userId)));
  const existingList = existingSnapshot.docs.find((listDoc) => normalizeName(String(listDoc.data().name || '')) === normalizeName(trimmedName));

  if (existingList) {
    return existingList.ref;
  }

  return addDoc(favoriteListsRef, {
    userId,
    name: trimmedName,
    projectIds: [],
    isDefault: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

export const renameFavoriteList = async (userId: string, listId: string, name: string) => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Favorite list name is required');
  }

  const currentListSnapshot = await getFavoriteListDoc(listId);
  if (!currentListSnapshot.exists()) {
    throw new Error('Lista de favoritos não encontrada');
  }

  const currentList = currentListSnapshot.data() as FavoriteList;
  if (currentList.isDefault) {
    throw new Error('A lista padrão não pode ser renomeada');
  }

  const favoriteListsRef = collection(db, FAVORITE_LISTS_COLLECTION);
  const existingSnapshot = await getDocs(query(favoriteListsRef, where('userId', '==', userId)));
  const existingList = existingSnapshot.docs.find((listDoc) => listDoc.id !== listId && normalizeName(String(listDoc.data().name || '')) === normalizeName(trimmedName));
  if (existingList) {
    throw new Error('Já existe uma lista com esse nome');
  }

  await updateDoc(doc(db, FAVORITE_LISTS_COLLECTION, listId), {
    name: trimmedName,
    updatedAt: Timestamp.now(),
  });
};

export const deleteFavoriteList = async (listId: string) => {
  const currentListSnapshot = await getFavoriteListDoc(listId);
  if (!currentListSnapshot.exists()) {
    throw new Error('Lista de favoritos não encontrada');
  }

  const currentList = currentListSnapshot.data() as FavoriteList;
  if (currentList.isDefault) {
    throw new Error('A lista padrão não pode ser excluída');
  }

  await deleteDoc(doc(db, FAVORITE_LISTS_COLLECTION, listId));
};

export const toggleProjectInFavoriteList = async (userId: string, listId: string, projectId: string) => {
  const listRef = doc(db, FAVORITE_LISTS_COLLECTION, listId);
  const listSnapshot = await getDocs(query(collection(db, FAVORITE_LISTS_COLLECTION), where('userId', '==', userId)));
  const listDoc = listSnapshot.docs.find(doc => doc.id === listId);

  if (!listDoc) {
    throw new Error('Favorite list not found');
  }

  const currentIds = Array.isArray(listDoc.data().projectIds) ? listDoc.data().projectIds.map(String) : [];
  const normalizedProjectId = String(projectId).trim();
  const nextProjectIds = currentIds.includes(normalizedProjectId)
    ? currentIds.filter(id => id !== normalizedProjectId)
    : [...currentIds, normalizedProjectId];

  await updateDoc(listRef, {
    userId,
    projectIds: nextProjectIds,
    updatedAt: Timestamp.now(),
  });

  return nextProjectIds.includes(normalizedProjectId);
};

export const isProjectInFavoriteList = (list: FavoriteList | null | undefined, projectId: string) => {
  if (!list) return false;
  return (list.projectIds || []).includes(projectId);
};
