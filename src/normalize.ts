const LEET_CHARS: Readonly<Record<string, string>> = {
  "0": "o",
  "1": "i",
  "!": "i",
  "|": "i",
  "3": "e",
  "4": "a",
  "@": "a",
  "5": "s",
  "$": "s",
  "7": "t",
  "+": "t",
  "8": "b"
};

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const REPEATED_CHARS = /([a-z0-9])\1+/g;
const TOKEN_CHARS = /[a-z0-9@#$]+(?:[!|+*._~-]*[a-z0-9@#$]+)*/g;

export interface NormalizedToken {
  readonly value: string;
  readonly raw: string;
  readonly index: number;
}

export function normalizeWord(word: string): string {
  return normalizeToken(word);
}

export function tokenize(input: string): readonly NormalizedToken[] {
  const normalizedInput = baseNormalize(input);
  const tokens: NormalizedToken[] = [];

  for (const match of normalizedInput.matchAll(TOKEN_CHARS)) {
    const raw = match[0] ?? "";
    const value = normalizeToken(raw);

    if (value.length > 0) {
      tokens.push({
        value,
        raw,
        index: match.index ?? 0
      });
    }
  }

  return tokens;
}

function baseNormalize(input: string): string {
  return input.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

function normalizeToken(token: string): string {
  let normalized = "";

  for (const char of baseNormalize(token)) {
    const mapped = LEET_CHARS[char] ?? char;

    if (/[a-z0-9]/.test(mapped)) {
      normalized += mapped;
    }
  }

  return normalized.replace(REPEATED_CHARS, "$1");
}
