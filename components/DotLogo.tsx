import React from 'react';
import BrandLogo from './BrandLogo';

interface DotLogoProps {
  theme: 'light' | 'dark';
  className?: string;
  variant?: 'compact' | 'login';
}

const DotLogo: React.FC<DotLogoProps> = ({ theme, className, variant }) => {
  return <BrandLogo theme={theme} className={className} variant={variant} />;
};

export default DotLogo;
