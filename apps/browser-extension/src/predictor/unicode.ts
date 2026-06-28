import type { UnicodeSpan, UnicodeSpanReason } from '@/shared';

type CharacterMapping = {
  normalized: string;
  reason?: UnicodeSpanReason;
  unicodeName?: string;
};

const HOMOGLYPHS: Record<string, CharacterMapping> = {
  '\u03BF': {
    normalized: 'o',
    reason: 'homoglyph',
    unicodeName: 'GREEK SMALL LETTER OMICRON',
  },
  '\u039F': {
    normalized: 'o',
    reason: 'homoglyph',
    unicodeName: 'GREEK CAPITAL LETTER OMICRON',
  },
  '\u0430': {
    normalized: 'a',
    reason: 'homoglyph',
    unicodeName: 'CYRILLIC SMALL LETTER A',
  },
  '\u0435': {
    normalized: 'e',
    reason: 'homoglyph',
    unicodeName: 'CYRILLIC SMALL LETTER IE',
  },
  '\u043E': {
    normalized: 'o',
    reason: 'homoglyph',
    unicodeName: 'CYRILLIC SMALL LETTER O',
  },
  '\u0440': {
    normalized: 'p',
    reason: 'homoglyph',
    unicodeName: 'CYRILLIC SMALL LETTER ER',
  },
  '\u0441': {
    normalized: 'c',
    reason: 'homoglyph',
    unicodeName: 'CYRILLIC SMALL LETTER ES',
  },
  '\u0445': {
    normalized: 'x',
    reason: 'homoglyph',
    unicodeName: 'CYRILLIC SMALL LETTER HA',
  },
  '\u0455': {
    normalized: 's',
    reason: 'homoglyph',
    unicodeName: 'CYRILLIC SMALL LETTER DZE',
  },
};

const NUMBER_SUBSTITUTIONS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
};

const INVISIBLE_CHARACTERS = new Set([
  '\u200B',
  '\u200C',
  '\u200D',
  '\u2060',
  '\uFEFF',
]);

function isAsciiLetterOrDigit(value: string): boolean {
  return /^[a-z0-9]+$/i.test(value);
}

function createSpan(
  index: number,
  char: string,
  reason: UnicodeSpanReason,
  normalizedAs?: string,
  unicodeName?: string,
): UnicodeSpan {
  return {
    start: index,
    end: index + char.length,
    char,
    reason,
    normalizedAs,
    unicodeName,
  };
}

export type NormalizedText = {
  normalizedText: string;
  originalText: string;
  originalIndexByNormalizedIndex: number[];
  unicodeSpans: UnicodeSpan[];
};

export function normalizeForPrediction(text: string): NormalizedText {
  let normalizedText = '';
  const originalIndexByNormalizedIndex: number[] = [];
  const unicodeSpans: UnicodeSpan[] = [];

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (INVISIBLE_CHARACTERS.has(char)) {
      unicodeSpans.push(createSpan(index, char, 'invisible'));
      continue;
    }

    const homoglyph = HOMOGLYPHS[char];
    const numberSubstitution = NUMBER_SUBSTITUTIONS[char];
    const nfkc = char.normalize('NFKC');

    let next = char.toLowerCase();

    if (homoglyph) {
      next = homoglyph.normalized;
      unicodeSpans.push(
        createSpan(
          index,
          char,
          homoglyph.reason ?? 'homoglyph',
          homoglyph.normalized,
          homoglyph.unicodeName,
        ),
      );
    } else if (numberSubstitution) {
      next = numberSubstitution;
      unicodeSpans.push(createSpan(index, char, 'symbol', numberSubstitution));
    } else if (nfkc !== char && isAsciiLetterOrDigit(nfkc)) {
      next = nfkc.toLowerCase();
      unicodeSpans.push(createSpan(index, char, 'symbol', next));
    }

    for (const normalizedChar of next) {
      normalizedText += normalizedChar;
      originalIndexByNormalizedIndex.push(index);
    }
  }

  return {
    normalizedText,
    originalText: text,
    originalIndexByNormalizedIndex,
    unicodeSpans,
  };
}
