import React from 'react';
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

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-1rem)] max-w-[640px] -translate-x-1/2 sm:hidden">
      <div
        className={`rounded-[24px] border backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.24)] ${
          isLightMode
            ? 'border-zinc-200 bg-white/92 text-zinc-700'
            : 'border-white/10 bg-zinc-950/92 text-white'
        }`}
      >
        <div className="grid grid-cols-5 gap-1 p-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = Boolean(item.active);

            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                disabled={!item.onClick}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center transition-colors disabled:cursor-default disabled:opacity-60 ${
                  active
                    ? 'bg-[#99cc00] text-zinc-950'
                    : isLightMode
                      ? 'text-zinc-700 hover:bg-zinc-100'
                      : 'text-white/80 hover:bg-white/8'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[9px] font-semibold leading-tight tracking-[0.02em]">
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
