import React from 'react';
import { Bookmark, Share2 } from 'lucide-react';

interface PageFilterActionsProps {
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
  onShare: () => void;
  feedback?: string;
  theme?: 'light' | 'dark';
}

const PageFilterActions: React.FC<PageFilterActionsProps> = ({ showFavoritesOnly, onToggleFavorites, onShare, feedback, theme = 'dark' }) => {
  const isLightMode = theme === 'light';
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onToggleFavorites}
        className={`inline-flex h-[52px] items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors ${
          showFavoritesOnly
            ? 'border-[#88C125] bg-[#88C125]/15 text-[#88C125]'
            : isLightMode
              ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
              : 'border-white/10 bg-white/6 text-white/90 hover:bg-white/10'
        }`}
      >
        <Bookmark className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
        Favoritos
      </button>

      <button
        type="button"
        onClick={onShare}
        className={`inline-flex h-[52px] items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors ${
          isLightMode
            ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
            : 'border-white/10 bg-white/6 text-white/90 hover:bg-white/10'
        }`}
      >
        <Share2 className="h-4 w-4" />
        Compartilhar
      </button>

      {feedback ? <span className={`text-xs font-medium ${isLightMode ? 'text-zinc-500' : 'text-white/55'}`}>{feedback}</span> : null}
    </div>
  );
};

export default PageFilterActions;
