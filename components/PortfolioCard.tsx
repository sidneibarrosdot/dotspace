import React from 'react';
import type { PortfolioItem } from '../types';
import DotLogo from './DotLogo';
import { HeartIcon, EyeIcon, Bookmark } from 'lucide-react';

interface PortfolioCardProps {
  item: PortfolioItem;
  onClick: (item: PortfolioItem) => void;
  onLike?: (item: PortfolioItem) => void;
  onToggleFavorite?: (item: PortfolioItem) => void;
  isFavorited?: boolean;
  isLiked?: boolean;
  theme: 'light' | 'dark';
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ item, onClick, onLike, onToggleFavorite, isFavorited, isLiked, theme }) => {
  const [imgError, setImgError] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(!!item.Imagem_capa);
  
  // Check if it's a Google Slides link
  const isGoogleSlides = item.Imagem_capa && item.Imagem_capa.includes('docs.google.com/presentation/d/');

  React.useEffect(() => {
    if (!item.Imagem_capa) {
      setImgError(true);
      setIsVerifying(false);
      return;
    }

    // If it's a Google Slides link, we don't verify it as an image
    if (isGoogleSlides) {
      setIsVerifying(false);
      setImgError(false);
      return;
    }

    const img = new Image();
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isVerifying) {
        setIsVerifying(false);
        setImgError(true);
      }
    }, 10000);

    img.src = item.Imagem_capa;
    img.onload = () => {
      clearTimeout(timeout);
      setIsVerifying(false);
      setImgError(false);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      setIsVerifying(false);
      setImgError(true);
    };

    return () => clearTimeout(timeout);
  }, [item.Imagem_capa, isGoogleSlides]);

  const showPlaceholder = imgError || !item.Imagem_capa || isVerifying;

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden shadow-md hover:shadow-xl transform transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-gray-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800 h-full sm:min-h-[360px] group"
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(item)}
      aria-label={`View details for ${item.Projeto}`}
    >
      {/* Image Section */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-gray-100 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-700/50">
        {!showPlaceholder ? (
          isGoogleSlides ? (
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
              <iframe
                className="w-full h-full absolute top-0 left-0 pointer-events-none scale-[1.15]"
                src={item.Imagem_capa.includes('?') ? `${item.Imagem_capa}&rm=minimal` : `${item.Imagem_capa}?rm=minimal`}
                frameBorder="0"
                title={item.Projeto}
              />
              {/* Overlay to prevent interaction and allow clicking the card */}
              <div className="absolute inset-0 z-10" />
            </div>
          ) : (
            <img
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              src={item.Imagem_capa}
              alt={item.Projeto}
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
              {isVerifying ? (
                <div className="animate-pulse flex flex-col items-center">
                  <DotLogo 
                    theme={theme} 
                    className="h-12 w-auto opacity-5 dark:opacity-20 object-contain mb-2" 
                  />
                  <div className="h-1.5 w-24 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-accent w-full animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <DotLogo 
                  theme={theme} 
                  className="h-16 w-auto opacity-30 dark:opacity-70 object-contain" 
                />
              )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-grow p-4 sm:p-5">
        <div className="flex-grow">
          <p className="text-xs font-bold text-accent uppercase tracking-wider mb-1 line-clamp-1" title={item.Cliente}>
            {item.Cliente}
          </p>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 line-clamp-2 leading-tight" title={item.Projeto}>
            {item.Projeto}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1" title={item.Time}>
            Time: {item.Time}
          </p>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between mt-2 pt-2 sm:mt-4 sm:pt-4 border-t border-gray-100 dark:border-zinc-700/50">
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5" title="Visualizações">
              <EyeIcon className="w-4 h-4" />
              <span className="font-medium">{item.views || 0}</span>
            </div>
            <button 
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                if (onLike) onLike(item); 
              }}
              className={`flex items-center gap-1.5 transition-colors relative z-30 cursor-pointer ${
                isLiked ? 'text-accent' : 'hover:text-accent'
              }`}
              title={isLiked ? "Descurtir" : "Curtir"}
            >
              <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{item.likes || 0}</span>
            </button>
            
            {onToggleFavorite && (
              <button 
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  onToggleFavorite(item); 
                }}
                className={`flex items-center gap-1.5 transition-colors relative z-30 cursor-pointer ${
                  isFavorited ? 'text-accent' : 'hover:text-accent'
                }`}
                title={isFavorited ? "Remover dos Favoritos" : "Salvar para ver depois"}
              >
                <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                <span className="font-medium">{isFavorited ? 'Salvo' : 'Salvar'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioCard;