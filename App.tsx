import React, { useState, useEffect } from 'react';
import CRTOverlay from './components/CRTOverlay';
import SubliminalFlash from './components/SubliminalFlash';
import Game from './components/Game';

const App: React.FC = () => {
  // Global sanity state could be lifted here if needed, 
  // but for a focused game, we keep logic inside Game component.
  
  return (
    <div className="h-screen w-screen bg-black text-gray-300 font-sans overflow-hidden relative selection:bg-red-900 selection:text-white">
      {/* Global Atmospherics */}
      <CRTOverlay />
      <SubliminalFlash />

      {/* Main Game Container */}
      <main className="absolute inset-0 z-10">
        <Game />
      </main>

      {/* Decorative Vignette (Extra layer for depth) */}
      <div className="fixed inset-0 pointer-events-none z-20 bg-gradient-radial from-transparent to-black/80"></div>
    </div>
  );
};

export default App;