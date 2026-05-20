import { useEffect, useMemo, useState } from 'react';

export interface LocalCardInteractionState {
  views: number;
  likes: number;
  liked: boolean;
  favorited: boolean;
  shares: number;
}

type InteractionMap = Record<string, LocalCardInteractionState>;

const defaultState: LocalCardInteractionState = {
  views: 0,
  likes: 0,
  liked: false,
  favorited: false,
  shares: 0,
};

const sanitizeCount = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

export const useLocalCardInteractions = (scope: string) => {
  const storageKey = `dotspace:card-interactions:${scope}`;
  const [interactions, setInteractions] = useState<InteractionMap>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as InteractionMap;
      if (parsed && typeof parsed === 'object') {
        setInteractions(parsed);
      }
    } catch {
      // ignore parse/storage errors in local simulation mode
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(interactions));
    } catch {
      // ignore storage errors in local simulation mode
    }
  }, [storageKey, interactions]);

  const getState = useMemo(
    () =>
      (id: string, baseViews = 0, baseLikes = 0, baseFavorited = false): LocalCardInteractionState => {
        const current = interactions[id];
        if (!current) {
          return {
            ...defaultState,
            views: sanitizeCount(baseViews),
            likes: sanitizeCount(baseLikes),
            favorited: baseFavorited,
          };
        }

        return {
          ...defaultState,
          ...current,
          views: sanitizeCount(current.views || baseViews),
          likes: sanitizeCount(current.likes || baseLikes),
          favorited: Boolean(current.favorited ?? baseFavorited),
        };
      },
    [interactions]
  );

  const setForItem = (
    id: string,
    baseViews: number,
    baseLikes: number,
    baseFavorited: boolean,
    updater: (current: LocalCardInteractionState) => LocalCardInteractionState
  ) => {
    setInteractions((prev) => {
      const current = prev[id] || getState(id, baseViews, baseLikes, baseFavorited);
      return {
        ...prev,
        [id]: updater(current),
      };
    });
  };

  const incrementViews = (id: string, baseViews = 0, baseLikes = 0, baseFavorited = false) => {
    setForItem(id, baseViews, baseLikes, baseFavorited, (current) => ({
      ...current,
      views: sanitizeCount(current.views) + 1,
    }));
  };

  const toggleLike = (id: string, baseViews = 0, baseLikes = 0, baseFavorited = false) => {
    setForItem(id, baseViews, baseLikes, baseFavorited, (current) => {
      const liked = !current.liked;
      const nextLikes = liked ? sanitizeCount(current.likes) + 1 : Math.max(0, sanitizeCount(current.likes) - 1);
      return {
        ...current,
        liked,
        likes: nextLikes,
      };
    });
  };

  const toggleFavorite = (id: string, baseViews = 0, baseLikes = 0, baseFavorited = false) => {
    setForItem(id, baseViews, baseLikes, baseFavorited, (current) => ({
      ...current,
      favorited: !current.favorited,
    }));
  };

  const registerShare = (id: string, baseViews = 0, baseLikes = 0, baseFavorited = false) => {
    setForItem(id, baseViews, baseLikes, baseFavorited, (current) => ({
      ...current,
      shares: sanitizeCount(current.shares) + 1,
    }));
  };

  return {
    interactions,
    getState,
    incrementViews,
    toggleLike,
    toggleFavorite,
    registerShare,
  };
};

