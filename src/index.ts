import { tokenize, normalizeWord, type NormalizedToken } from "./normalize.js";
import { INDONESIAN_WORDS, type IndonesianWord } from "./words.js";

export type SupportedLanguage = "id";

/**
 * A detected profanity token and its location in the original input.
 */
export interface ProfanityMatch<Word extends string = string> {
  /** The dictionary word that matched after normalization. */
  readonly word: Word;
  /** The original token from the input, before normalization. */
  readonly raw: string;
  /** The normalized token used for dictionary lookup. */
  readonly normalized: string;
  /** Zero-based character index where the raw token starts. */
  readonly index: number;
}

/**
 * Options shared by read-only detection helpers.
 */
export interface ProfanityOptions<AdditionalWord extends string = never> {
  /** Extra words to merge with the default dictionary for this call only. */
  readonly additionalWords?: readonly AdditionalWord[];
}

/**
 * Options for replacing detected profanity.
 */
export interface CleanOptions<AdditionalWord extends string = never>
  extends ProfanityOptions<AdditionalWord> {
  /** Replacement string or callback. Defaults to `"***"`. */
  readonly replacement?:
    | string
    | ((match: ProfanityMatch<DefaultWord<AdditionalWord>>) => string);
}

/**
 * Options for creating an isolated reusable profanity filter.
 */
export interface FilterOptions<Word extends string = IndonesianWord> {
  /** Words that should be detected by this filter. */
  readonly words: readonly Word[];
  readonly replacement?: string | ((match: ProfanityMatch<Word>) => string);
}

/**
 * A reusable profanity filter with its own dictionary.
 */
export interface ProfanityFilter<Word extends string = IndonesianWord> {
  /** The words configured for this filter. */
  readonly words: readonly Word[];
  /** Returns whether the input contains at least one configured word. */
  containsProfanity(input: string): boolean;
  /** Returns all configured words found in the input. */
  findProfanity(input: string): readonly ProfanityMatch<Word>[];
  /** Returns input with configured words replaced. */
  clean(input: string, options?: Pick<FilterOptions<Word>, "replacement">): string;
}

type DefaultWord<AdditionalWord extends string = never> =
  | IndonesianWord
  | string
  | AdditionalWord;

const DEFAULT_REPLACEMENT = "***";

const DEFAULT_FILTER = createFilter({
  words: INDONESIAN_WORDS
});

const addedWords = new Map<string, string>();
let cachedDefaultFilter: ProfanityFilter<IndonesianWord | string> = DEFAULT_FILTER;
let isDefaultFilterDirty = false;

/**
 * Add words to the shared default filter used by `containsProfanity`,
 * `findProfanity`, and `clean`.
 *
 * Use this during application startup when your project has product-specific
 * words that should be detected everywhere. Words are normalized and deduped
 * with the same rules as the built-in Indonesian dictionary.
 */
export function addWords(words: readonly string[]): void {
  for (const word of words) {
    const normalized = normalizeWord(word);

    if (normalized.length > 0) {
      addedWords.set(normalized, word);
    }
  }

  isDefaultFilterDirty = true;
}

/**
 * Remove all words previously registered through `addWords`.
 *
 * This is useful for tests, worker reuse, or apps that need to rebuild their
 * moderation policy at runtime.
 */
export function clearWords(): void {
  addedWords.clear();
  cachedDefaultFilter = DEFAULT_FILTER;
  isDefaultFilterDirty = false;
}

/**
 * Returns `true` when input contains a word from the default Indonesian
 * dictionary, shared words registered with `addWords`, or per-call
 * `additionalWords`.
 */
export function containsProfanity<AdditionalWord extends string = never>(
  input: string,
  options: ProfanityOptions<AdditionalWord> = {}
): boolean {
  return getDefaultFilter(options.additionalWords).containsProfanity(input);
}

/**
 * Finds profanity matches in input and returns match details, including the raw
 * token, normalized token, matched dictionary word, and start index.
 */
export function findProfanity<AdditionalWord extends string = never>(
  input: string,
  options: ProfanityOptions<AdditionalWord> = {}
): readonly ProfanityMatch<DefaultWord<AdditionalWord>>[] {
  return getDefaultFilter(options.additionalWords).findProfanity(input);
}

/**
 * Replaces profanity in input. By default matches are replaced with `"***"`,
 * but callers can provide a replacement string or callback.
 */
export function clean<AdditionalWord extends string = never>(
  input: string,
  options: CleanOptions<AdditionalWord> = {}
): string {
  const filter = getDefaultFilter(options.additionalWords);

  if (options.replacement === undefined) {
    return filter.clean(input);
  }

  return filter.clean(input, {
    replacement: options.replacement
  });
}

/**
 * Creates an isolated reusable filter with its own word list.
 *
 * Prefer this when you need multiple independent dictionaries or literal
 * TypeScript word types. Use `addWords` when you want to extend the package's
 * shared default filter once for the whole app.
 */
export function createFilter<Word extends string>(
  options: Pick<FilterOptions<Word>, "words">
): ProfanityFilter<Word> {
  const words = [...options.words];
  const dictionary = createDictionary(words);

  return {
    words,
    containsProfanity(input) {
      return findMatches(input, dictionary).length > 0;
    },
    findProfanity(input) {
      return findMatches(input, dictionary);
    },
    clean(input, cleanOptions = {}) {
      return replaceMatches(input, findMatches(input, dictionary), cleanOptions.replacement);
    }
  };
}

function createDictionary<Word extends string>(
  words: readonly Word[]
): ReadonlyMap<string, Word> {
  const dictionary = new Map<string, Word>();

  for (const word of words) {
    const normalized = normalizeWord(word);

    if (normalized.length > 0) {
      dictionary.set(normalized, word);
    }
  }

  return dictionary;
}

function getDefaultFilter<AdditionalWord extends string>(
  additionalWords: readonly AdditionalWord[] | undefined
): ProfanityFilter<DefaultWord<AdditionalWord>> {
  const sharedFilter = getSharedDefaultFilter();

  if (additionalWords === undefined || additionalWords.length === 0) {
    return sharedFilter;
  }

  return createFilter({
    words: [...sharedFilter.words, ...additionalWords]
  });
}

function getSharedDefaultFilter(): ProfanityFilter<IndonesianWord | string> {
  if (!isDefaultFilterDirty) {
    return cachedDefaultFilter;
  }

  cachedDefaultFilter = createFilter({
    words: [...INDONESIAN_WORDS, ...addedWords.values()]
  });
  isDefaultFilterDirty = false;

  return cachedDefaultFilter;
}

function findMatches<Word extends string>(
  input: string,
  dictionary: ReadonlyMap<string, Word>
): readonly ProfanityMatch<Word>[] {
  const matches: ProfanityMatch<Word>[] = [];

  for (const token of tokenize(input)) {
    const word = dictionary.get(token.value);

    if (word !== undefined) {
      matches.push(toMatch(token, word));
    }
  }

  return matches;
}

function toMatch<Word extends string>(
  token: NormalizedToken,
  word: Word
): ProfanityMatch<Word> {
  return {
    word,
    raw: token.raw,
    normalized: token.value,
    index: token.index
  };
}

function replaceMatches<Word extends string>(
  input: string,
  matches: readonly ProfanityMatch<Word>[],
  replacement: FilterOptions<Word>["replacement"] = DEFAULT_REPLACEMENT
): string {
  if (matches.length === 0) {
    return input;
  }

  let cursor = 0;
  let output = "";

  for (const match of matches) {
    output += input.slice(cursor, match.index);
    output += typeof replacement === "function" ? replacement(match) : replacement;
    cursor = match.index + match.raw.length;
  }

  return output + input.slice(cursor);
}

export { INDONESIAN_WORDS };
export type { IndonesianWord };
