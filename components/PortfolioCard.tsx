import React from 'react';
import type { PortfolioItem } from '../types';
import DotLogo from './DotLogo';
import { HeartIcon, EyeIcon, Bookmark, Share2 } from 'lucide-react';

interface PortfolioCardProps {
  item: PortfolioItem;
  onClick: (item: PortfolioItem) => void;
  onLike?: (item: PortfolioItem) => void;
  onToggleFavorite?: (item: PortfolioItem) => void;
  onShare?: (item: PortfolioItem) => Promise<void> | void;
  isFavorited?: boolean;
  isLiked?: boolean;
  theme: 'light' | 'dark';
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ item, onClick, onLike, onToggleFavorite, onShare, isFavorited, isLiked, theme }) => {
  const [imgError, setImgError] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(!!item.Imagem_capa);
  const [shareMessage, setShareMessage] = React.useState('');
  
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
      className="flex flex-col rounded-xl overflow-hidden shadow-md hover:shadow-xl transform transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-gray-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800 h-full sm:min-h-[360px] group min-w-0"
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
                src={(() => {
                  let embedUrl = item.Imagem_capa.replace(/\/pub(\?|$)/, '/embed$1');
                  return embedUrl.includes('?') ? `${embedUrl}&rm=minimal` : `${embedUrl}?rm=minimal`;
                })()}
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
      <div className="flex flex-col flex-grow p-3 sm:p-5 min-w-0">
        <div className="flex-grow">
          <p className="text-[10px] sm:text-xs font-bold text-accent uppercase tracking-wider mb-1 line-clamp-1" title={item.Cliente}>
            {item.Cliente}
          </p>
          <h3 className="text-sm sm:text-lg font-bold text-zinc-900 dark:text-white mb-2 line-clamp-2 leading-tight" title={item.Projeto}>
            {item.Projeto}
          </h3>
          <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-1" title={item.Time}>
            Time: {item.Time}
          </p>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-start mt-2 pt-2 sm:mt-4 sm:pt-4 border-t border-gray-100 dark:border-zinc-700/50">
          <div className="flex w-full items-center justify-start gap-2.5 text-[11px] text-gray-500 dark:text-gray-400 min-w-0 sm:gap-4 sm:text-sm">
            <div className="inline-flex min-h-11 min-w-11 shrink-0 items-center gap-1.5 rounded-md px-2 sm:px-0" title="Visualizações">
              <EyeIcon className="w-4 h-4 shrink-0" />
              <span className="font-medium">{item.views || 0}</span>
            </div>
            <button 
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                if (onLike) onLike(item); 
              }}
              className={`inline-flex min-h-11 min-w-11 shrink-0 items-center gap-1.5 rounded-md px-2 sm:px-0 transition-colors relative z-30 cursor-pointer ${
                isLiked ? 'text-accent' : 'hover:text-accent'
              }`}
              title={isLiked ? "Descurtir" : "Curtir"}
            >
              <HeartIcon className={`w-4 h-4 shrink-0 ${isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{item.likes || 0}</span>
            </button>
            
            {onToggleFavorite && (
              <button 
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  onToggleFavorite(item); 
                }}
                className={`inline-flex min-h-11 min-w-11 shrink-0 items-center gap-1.5 rounded-md px-2 sm:px-0 transition-colors relative z-30 cursor-pointer ${
                  isFavorited ? 'text-accent' : 'hover:text-accent'
                }`}
                title={isFavorited ? "Remover dos Favoritos" : "Salvar para ver depois"}
              >
                <Bookmark className={`w-4 h-4 shrink-0 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            )}

            {onShare && (
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    await onShare(item);
                    setShareMessage('Link copiado');
                  } catch {
                    setShareMessage('Erro ao copiar');
                  }
                  window.setTimeout(() => setShareMessage(''), 2500);
                }}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center gap-1.5 rounded-md px-2 sm:px-0 transition-colors relative z-30 cursor-pointer hover:text-accent"
                title="Copiar link deste projeto"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                {shareMessage && (
                  <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-lg whitespace-nowrap dark:bg-zinc-700">
                    {shareMessage}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioCard;
