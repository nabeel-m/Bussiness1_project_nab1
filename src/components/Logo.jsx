import React from 'react';
import officialLogoImg from '../assets/logo_new.png';

export default function Logo({ 
  customLogoUrl = null, 
  variant = 'full', 
  className = '', 
  printMode = false 
}) {
  const logoSrc = customLogoUrl || officialLogoImg;

  return (
    <div 
      className={`logo-container ${className}`} 
      style={{ display: 'block', textAlign: 'center', width: '100%', margin: '0 auto' }}
    >
      <img 
        src={logoSrc} 
        alt="SMART TECH ™ Logo" 
        style={{ 
          maxHeight: variant === 'icon-only' ? '85px' : (printMode ? '165px' : '145px'), 
          width: 'auto', 
          objectFit: 'contain', 
          display: 'block', 
          margin: '0 auto',
          maxWidth: '100%'
        }}
      />
    </div>
  );
}
