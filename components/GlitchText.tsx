import React, { useState, useEffect, useRef } from 'react';

interface GlitchTextProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  intensity?: number; // 0 to 1
  preserveSpace?: boolean;
}

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/øµ¶§';

const GlitchText: React.FC<GlitchTextProps> = ({ 
  text, 
  as = 'span', 
  className = '', 
  intensity = 0.1,
  preserveSpace = true
}) => {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Randomly glitch the text
    const glitch = () => {
      if (Math.random() > intensity) {
        setDisplayText(text);
        return;
      }

      const splitText = text.split('');
      const glitched = splitText.map((char) => {
        if (char === ' ' && preserveSpace) return ' ';
        if (Math.random() < 0.3) {
          return chars[Math.floor(Math.random() * chars.length)];
        }
        return char;
      });
      setDisplayText(glitched.join(''));
    };

    intervalRef.current = window.setInterval(glitch, 150 + Math.random() * 400);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, intensity, preserveSpace]);

  const Component = as;

  return (
    <Component className={`${className} font-mono relative inline-block`}>
      {displayText}
      {Math.random() < intensity * 0.5 && (
        <span className="absolute top-0 left-0 -ml-0.5 text-red-500 opacity-70 mix-blend-screen animate-pulse">
          {displayText}
        </span>
      )}
      {Math.random() < intensity * 0.5 && (
        <span className="absolute top-0 left-0 ml-0.5 text-cyan-500 opacity-70 mix-blend-screen">
          {displayText}
        </span>
      )}
    </Component>
  );
};

export default GlitchText;