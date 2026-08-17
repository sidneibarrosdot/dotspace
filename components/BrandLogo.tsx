import React from 'react';
import wordmarkLight from '../assets/dotspace-light.svg';
import wordmarkDark from '../assets/dotspace-dark.svg';
import planetsLight from '../assets/planetas-light.svg';
import planetsDark from '../assets/planetas-dark.svg';

interface BrandLogoProps {
  theme: 'light' | 'dark';
  className?: string;
  variant?: 'compact' | 'login';
}

const BrandLogo: React.FC<BrandLogoProps> = ({ theme, className, variant = 'compact' }) => {
  const version = '2026-08-17-planets-5';
  const withVersion = (src: string) => (src.startsWith('data:') ? src : `${src}?v=${version}`);
  const planetsSrc = withVersion(theme === 'dark' ? planetsDark : planetsLight);
  const wordmarkSrc = withVersion(theme === 'dark' ? wordmarkDark : wordmarkLight);

  if (variant === 'login') {
    return (
      <div
        className={`inline-flex items-center gap-0.5 overflow-visible ${className ?? ''}`}
      >
        <div
          className="relative shrink-0"
          style={{
            width: 'calc(var(--brand-planet, clamp(52px, 7vw, 86px)) * 1.38)',
            height: 'calc(var(--brand-planet, clamp(52px, 7vw, 86px)) * 1.24)',
          }}
        >
          <img
            src={planetsSrc}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>
        <div
          className="relative shrink-0"
          style={{
            width: 'calc(var(--brand-planet, clamp(52px, 7vw, 86px)) * 2.6)',
            height: 'calc(var(--brand-planet, clamp(52px, 7vw, 86px)) * 0.6)',
          }}
        >
          <img
            src={wordmarkSrc}
            alt="dot.space"
            className="h-full w-full object-contain"
            draggable={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex w-full items-center gap-[0.8em] overflow-visible ${className ?? ''}`}>
      <div className="relative h-full w-[3em] shrink-0">
        <img
          src={planetsSrc}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain pointer-events-none"
          draggable={false}
        />
      </div>
      <div className="relative min-w-0 flex-1">
        <img
          src={wordmarkSrc}
          alt="dot.space"
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
};

export default BrandLogo;
