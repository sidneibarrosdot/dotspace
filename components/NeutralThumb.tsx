import React from 'react';
import thumbImage from '../assets/thumb.jpg';

interface NeutralThumbProps {
  className?: string;
  theme?: 'light' | 'dark';
}

const NeutralThumb: React.FC<NeutralThumbProps> = ({ className = '', theme = 'dark' }) => {
  const isLightMode = theme === 'light';
  return (
    <div className={`relative h-full w-full overflow-hidden ${className} ${isLightMode ? 'bg-zinc-100' : ''}`}>
      <img
        src={thumbImage}
        alt="Thumb neutra"
        className={`h-full w-full object-cover ${isLightMode ? 'grayscale-[0.95] brightness-[1.02] contrast-75 opacity-70' : ''}`}
      />
      <div
        className={`absolute inset-0 ${
          isLightMode ? 'bg-gradient-to-br from-zinc-100/65 via-zinc-200/45 to-zinc-300/25 mix-blend-multiply' : 'bg-gradient-to-br from-black/30 via-black/18 to-black/45'
        }`}
      />
    </div>
  );
};

export default NeutralThumb;
