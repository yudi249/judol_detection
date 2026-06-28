export type Platform = 'youtube' | 'telegram' | 'x' | 'simulation' | 'unknown';

export type PlatformScope = {
  youtube: boolean;
  telegram: boolean;
  x: boolean;
  simulation: boolean;
  otherSites: boolean;
};

export type ProtectionStatus = 'active' | 'disabled' | 'unsupported' | 'error';
