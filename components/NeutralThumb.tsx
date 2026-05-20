import React from 'react';
import thumbImage from '../assets/thumb.jpg';
import planetsDark from '../assets/planetas-dark.svg';
import planetsLight from '../assets/planetas-light.svg';

interface NeutralThumbProps {
  theme: 'light' | 'dark';
  className?: string;
}

const NeutralThumb: React.FC<NeutralThumbProps> = ({ theme, className = '' }) => {
  const planetsSrc = theme === 'light' ? planetsLight : planetsDark;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <img
        src={thumbImage}
        alt="Thumb neutra"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/18 to-black/45" />
      <img
        src={planetsSrc}
        alt=""
        aria-hidden="true"
        className="absolute bottom-3 right-3 h-10 w-10 opacity-85"
      />
    </div>
  );
};

export default NeutralThumb;
