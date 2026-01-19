import React, { useEffect, useState } from 'react';

const CRTOverlay: React.FC = () => {
  const [vignetteIntensity, setVignetteIntensity] = useState(0.4);

  useEffect(() => {
    // Breathing effect for the vignette
    const interval = setInterval(() => {
      setVignetteIntensity(0.4 + Math.random() * 0.1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden w-full h-full">
      {/* Scanlines */}
      <div 
        className="absolute inset-0 z-50 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 2px, 3px 100%'
        }}
      />
      
      {/* Vignette */}
      <div 
        className="absolute inset-0 z-40 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,${vignetteIntensity}) 100%)`
        }}
      />

      {/* Screen Curvature / Border (Simulated) */}
      <div className="absolute inset-0 border-[1px] border-white/5 z-50 rounded-lg"></div>
      
      {/* Occasional refresh line */}
      <div className="w-full h-1 bg-white/5 absolute top-0 animate-[scan_8s_linear_infinite] opacity-30"></div>

      <style>{`
        @keyframes scan {
          0% { top: -10%; opacity: 0; }
          10% { opacity: 0.3; }
          90% { opacity: 0.3; }
          100% { top: 110%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CRTOverlay;