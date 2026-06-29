export type Platform = 'youtube' | 'telegram' | 'x' | 'simulation' | 'unknown';

export type PlatformScope = {
  youtube: boolean;
  telegram: boolean;
  x: boolean;
  simulation: boolean;
  otherSites: boolean;
};

export type ProtectionStatus = 'active' | 'disabled' | 'unsupported' | 'error';

export function detectPlatformFromUrl(url?: string): Platform {
  if (!url) {
    return 'unknown';
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'unknown';
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    return 'youtube';
  }
  if (host === 'web.telegram.org') {
    return 'telegram';
  }
  if (host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com') {
    return 'x';
  }
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'simulation';
  }

  return 'unknown';
}
