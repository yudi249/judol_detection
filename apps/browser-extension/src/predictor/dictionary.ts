export const STRONG_TERMS = [
  'slot',
  'gacor',
  'deposit',
  'bonus',
  'maxwin',
  'rtp',
  'scatter',
  'pragmatic',
  'togel',
  'jackpot',
  'casino',
  'taruhan',
] as const;

export const WEAK_TERMS = [
  'bet',
  'spin',
  'wd',
  'withdraw',
  'saldo',
  'menang',
  'cuan',
  'akun',
  'daftar',
  'link',
] as const;

export const PHRASES = [
  'new member',
  'deposit 10k',
  'bonus 100',
  'slot gacor',
  'maxwin hari ini',
  'rtp live',
  'link alternatif',
  'daftar sekarang',
  'withdraw cepat',
] as const;

export const SCORING_WEIGHTS = {
  base: 0.05,
  strongTerm: 0.25,
  weakTerm: 0.12,
  phrase: 0.1,
  unicodeAny: 0.12,
  unicodeAdditionalSpan: 0.04,
  min: 0.01,
  max: 0.99,
} as const;
