import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  theme: 'light' | 'dark';
  label?: string;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, theme, label }) => {
  const isLightMode = theme === 'light';

  if (totalPages <= 1) return null;

  const clampPage = (page: number) => Math.min(Math.max(page, 1), totalPages);
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <div
      className={`flex flex-col gap-3 rounded-[24px] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
        isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/10 bg-white/5'
      }`}
    >
      <div className={`text-xs font-semibold uppercase tracking-[0.26em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>
        {label || `Página ${currentPage} de ${totalPages}`}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onPageChange(clampPage(currentPage - 1))}
          disabled={currentPage <= 1}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white/80 hover:bg-white/10'
          }`}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          {pages[0] > 1 && (
            <>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                className={`h-10 rounded-full border px-3 text-sm font-semibold transition-colors ${
                  isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white/80 hover:bg-white/10'
                }`}
              >
                1
              </button>
              {pages[0] > 2 && <span className={isLightMode ? 'text-zinc-400' : 'text-white/40'}>…</span>}
            </>
          )}

          {pages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`h-10 rounded-full border px-3 text-sm font-semibold transition-colors ${
                page === currentPage
                  ? 'border-[#88C125] bg-[#88C125] text-white'
                  : isLightMode
                    ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    : 'border-white/10 bg-white/6 text-white/80 hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          ))}

          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className={isLightMode ? 'text-zinc-400' : 'text-white/40'}>…</span>}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                className={`h-10 rounded-full border px-3 text-sm font-semibold transition-colors ${
                  isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white/80 hover:bg-white/10'
                }`}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(clampPage(currentPage + 1))}
          disabled={currentPage >= totalPages}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white/80 hover:bg-white/10'
          }`}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
