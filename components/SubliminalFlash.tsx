import React, { useEffect, useState } from 'react';

const IMAGES = [
  "https://picsum.photos/1920/1080?grayscale&blur=2",
  "https://picsum.photos/1920/1080?grayscale&contrast=2",
  "https://picsum.photos/seed/horror/1920/1080?grayscale",
];

const SubliminalFlash: React.FC = () => {
  const [active, setActive] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [invert, setInvert] = useState(false);

  useEffect(() => {
    // Random triggers
    const trigger = () => {
      const delay = Math.random() * 20000 + 5000; // Between 5s and 25s
      setTimeout(() => {
        setImgSrc(IMAGES[Math.floor(Math.random() * IMAGES.length)]);
        setInvert(Math.random() > 0.5);
        setActive(true);
        
        // Flash duration (subliminal: 10ms - 50ms)
        setTimeout(() => {
          setActive(false);
          trigger(); // Schedule next
        }, 30 + Math.random() * 50); 
      }, delay);
    };

    trigger();
  }, []);

  if (!active) return null;

  return (
    <div className={`fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-black ${invert ? 'invert' : ''}`}>
      <img 
        src={imgSrc} 
        alt="" 
        className="w-full h-full object-cover opacity-60 mix-blend-overlay"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <h1 className="text-9xl font-black text-red-600 mix-blend-difference scale-150 tracking-widest uppercase">
            {Math.random() > 0.5 ? 'WAKE UP' : 'DON\'T LOOK'}
        </h1>
      </div>
    </div>
  );
};

export default SubliminalFlash;