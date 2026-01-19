import React from 'react';

export type SectionId = 'overview' | 'plot' | 'gameplay' | 'scene' | 'audio' | 'simulation';

export interface GDDSection {
  id: SectionId;
  title: string;
  corruptedTitle?: string;
  content: React.ReactNode;
  decryptionLevel: number; // 0-100, requires interaction to reveal
}

export enum GlitchIntensity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}