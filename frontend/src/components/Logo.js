import React from 'react';
import './Logo.css';

const Logo = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'logo-small',
    medium: 'logo-medium',
    large: 'logo-large'
  };

  // Use image.png
  const handleImageError = (e) => {
    // Hide image if it fails to load
    e.target.style.display = 'none';
  };

  return (
    <div className={`logo-container ${sizeClasses[size]} ${className}`}>
      <img 
        src="/image.png"
        alt="Synapse Logo - سِنابس"
        className="logo-image"
        onError={handleImageError}
      />
    </div>
  );
};

export default Logo;
