import { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';

export interface LocalCardInteractionState {
  views: number;
  likes: number;
  liked: boolean;
  favorited: boolean;
  shares: number;
}

export type CardInteractionAction =
  | 'view'
  | 'open'
  | 'like'
  | 'unlike'
  | 'favorite'
  | 'unfavorite'
  | 'share'
  | 'reply'
  | 'create';

export interface LocalCardInteractionEvent {
  id: string;
  timestamp: string;
  scope: string;
  itemId: string;
  action: CardInteractionAction;
  userLabel: string;
}

type InteractionMap = Record<string, LocalCardInteractionState>;

const defaultState: LocalCardInteractionState = {
  views: 0,
  likes: 0,
  liked: false,
  favorited: false,
  shares: 0,
};

export const CARD_INTERACTION_EVENTS_STORAGE_KEY = 'dotspace:card-interaction-events';
const MAX_CARD_INTERACTION_EVENTS = 250;

const sanitizeCount = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readStoredCardInteractionEvents = (): LocalCardInteractionEvent[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(CARD_INTERACTION_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalCardInteractionEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((event) => Boolean(event && event.id && event.timestamp && event.scope && event.itemId));
  } catch {
    return [];
  }
};

const writeStoredCardInteractionEvents = (events: LocalCardInteractionEvent[]) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(CARD_INTERACTION_EVENTS_STORAGE_KEY, JSON.stringify(events.slice(0, MAX_CARD_INTERACTION_EVENTS)));
  } catch {
    // ignore storage errors in local simulation mode
  }
};

const getLocalUserLabel = () => auth.currentUser?.displayName || auth.currentUser?.email || 'Usuário DOT';

export const readLocalCardInteractionEvents = () =>
  readStoredCardInteractionEvents().sort((a, b) => b.timestamp.localeCompare(a.timestamp));

export const recordLocalCardInteractionEvent = (
  scope: string,
  itemId: string,
  action: CardInteractionAction,
) => {
  if (!scope || !itemId) return;

  const event: LocalCardInteractionEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    scope,
    itemId,
    action,
    userLabel: getLocalUserLabel(),
  };

  const nextEvents = [event, ...readStoredCardInteractionEvents()].slice(0, MAX_CARD_INTERACTION_EVENTS);
  writeStoredCardInteractionEvents(nextEvents);
  window.dispatchEvent(new Event('dotspace:card-interaction-events-updated'));
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
    recordLocalCardInteractionEvent(scope, id, 'view');
  };

  const toggleLike = (id: string, baseViews = 0, baseLikes = 0, baseFavorited = false) => {
    const current = getState(id, baseViews, baseLikes, baseFavorited);
    recordLocalCardInteractionEvent(scope, id, current.liked ? 'unlike' : 'like');
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
    const current = getState(id, baseViews, baseLikes, baseFavorited);
    recordLocalCardInteractionEvent(scope, id, current.favorited ? 'unfavorite' : 'favorite');
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
    recordLocalCardInteractionEvent(scope, id, 'share');
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
