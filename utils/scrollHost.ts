export const getScrollHost = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return document.getElementById('root');
};

export const getScrollTop = (): number => {
  const host = getScrollHost();
  return host?.scrollTop || window.scrollY || document.documentElement.scrollTop || 0;
};

export const getViewportHeight = (): number => {
  const host = getScrollHost();
  return host?.clientHeight || window.innerHeight;
};

export const getScrollHeight = (): number => {
  const host = getScrollHost();
  return host?.scrollHeight || document.documentElement.scrollHeight || document.body.scrollHeight;
};

export const scrollToAppTop = (behavior: ScrollBehavior = 'smooth') => {
  const host = getScrollHost();
  host?.scrollTo({ top: 0, behavior });
  window.scrollTo({ top: 0, behavior });
};

export const scrollAppTo = (top: number, behavior: ScrollBehavior = 'smooth') => {
  const host = getScrollHost();
  host?.scrollTo({ top, behavior });
  window.scrollTo({ top, behavior });
};

export const addAppScrollListener = (listener: () => void) => {
  const host = getScrollHost();
  host?.addEventListener('scroll', listener, { passive: true });
  window.addEventListener('scroll', listener, { passive: true });

  return () => {
    host?.removeEventListener('scroll', listener);
    window.removeEventListener('scroll', listener);
  };
};
