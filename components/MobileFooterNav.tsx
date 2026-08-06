import React, { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface MobileFooterNavItem {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}

interface MobileFooterNavProps {
  theme: 'light' | 'dark';
  items: MobileFooterNavItem[];
}

const MobileFooterNav: React.FC<MobileFooterNavProps> = ({ theme, items }) => {
  const isLightMode = theme === 'light';
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    const activeItem = activeRef.current;
    if (!container || !activeItem) return;
    container.scrollTo({
      left: activeItem.offsetLeft - (container.clientWidth - activeItem.clientWidth) / 2,
      behavior: 'smooth',
    });
  }, [items]);

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-1rem)] max-w-[760px] -translate-x-1/2 lg:hidden">
      <div
        className={`rounded-[24px] border backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.24)] ${
          isLightMode
            ? 'border-zinc-200 bg-white/92 text-zinc-700'
            : 'border-white/10 bg-zinc-950/92 text-white'
        }`}
      >
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-1 overflow-x-auto p-2 overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2 sm:p-3"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = Boolean(item.active);

            return (
              <button
                key={item.label}
                ref={active ? activeRef : undefined}
                type="button"
                onClick={item.onClick}
                disabled={!item.onClick}
                className={`flex min-w-[78px] snap-center flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2.5 text-center transition-colors disabled:cursor-default disabled:opacity-60 sm:min-w-[92px] sm:py-3 ${
                  active
                    ? 'bg-[#99cc00] text-zinc-950'
                    : isLightMode
                      ? 'text-zinc-700 hover:bg-zinc-100'
                      : 'text-white/80 hover:bg-white/8'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
                <span className="text-[10px] font-semibold leading-tight tracking-[0.01em] sm:text-[11px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileFooterNav;
