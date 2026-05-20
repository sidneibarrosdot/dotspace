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
  const version = '2026-05-19-5';
  const planetsSrc = `${theme === 'dark' ? planetsDark : planetsLight}?v=${version}`;
  const wordmarkSrc = `${theme === 'dark' ? wordmarkDark : wordmarkLight}?v=${version}`;

  if (variant === 'login') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 overflow-visible ${className ?? ''}`}
      >
        <div
          className="relative shrink-0"
          style={{
            width: 'var(--brand-planet, clamp(52px, 7vw, 86px))',
            height: 'var(--brand-planet, clamp(52px, 7vw, 86px))',
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
      <div className="relative h-full w-[2.7em] shrink-0">
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
