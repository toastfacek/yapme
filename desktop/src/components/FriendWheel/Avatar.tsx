import React from 'react';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
  isTape?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 'md', online, className = '', isTape }) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`
        relative overflow-hidden border-2 border-ink bg-concrete
        ${size === 'lg' ? 'w-48 h-48' : 'w-10 h-10'}
        ${isTape ? 'border-dashed' : ''}
      `}>
        <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover filter grayscale contrast-125 ${!online && !isTape ? 'opacity-50 brightness-50' : ''}`}
        />

        {/* Technical Overlays */}
        <div className="absolute inset-0 pointer-events-none">
            {/* Corner Markers */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-white/50"></div>
            <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-white/50"></div>
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-white/50"></div>
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-white/50"></div>

            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[1px] bg-white/30"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-[1px] bg-white/30"></div>
        </div>
      </div>

      {/* LED Status Indicator */}
      {online !== undefined && (
        <div className={`
          absolute -bottom-1 -right-1 w-3 h-3 border border-ink
          ${online ? 'bg-led shadow-[0_0_5px_#00FF41]' : 'bg-concrete'}
        `} />
      )}
    </div>
  );
};
