import React from "react";

interface RevaLogoProps {
  showText?: boolean;
  className?: string;
  light?: boolean;
  noBlend?: boolean;
  large?: boolean;
}

export default function RevaLogo({ 
  showText = true, 
  className = "", 
  light = false, 
  noBlend = false,
  large = false 
}: RevaLogoProps) {
  // Use CSS mix-blend modes to dynamically discard white or black background pixels
  const blendClass = noBlend ? "" : (light ? "mix-blend-screen" : "mix-blend-multiply");
  const sizeClass = large ? "h-14" : "h-10";
  const iconSizeClass = large ? "w-14 h-14" : "w-10 h-10";
  
  return (
    <div className={`flex items-center select-none ${className}`}>
      {showText ? (
        <img 
          src="/reva_logo.png" 
          alt="REVA Academy for Corporate Excellence (RACE) Logo" 
          className={`${sizeClass} object-contain flex-shrink-0 ${blendClass}`} 
          style={{ filter: light ? "brightness(0) invert(1)" : "none" }}
        />
      ) : (
        <img 
          src="/reva_logo_icon.png" 
          alt="REVA Logo Icon" 
          className={`${iconSizeClass} object-contain flex-shrink-0 ${blendClass}`}
          style={{ filter: light ? "brightness(0) invert(1)" : "none" }}
        />
      )}
    </div>
  );
}
