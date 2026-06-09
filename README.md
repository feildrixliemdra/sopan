# sopan

Small TypeScript-first profanity filter for Indonesian text.

`sopan` is dependency-free at runtime and exposes a compact API for JavaScript and TypeScript projects.

## Install

```sh
npm install sopan
```

```sh
pnpm add sopan
```

```sh
yarn add sopan
```

```sh
bun add sopan
```

## Usage

```ts
import { addWords, clean, containsProfanity, findProfanity } from "sopan";

addWords(["kasar"]);

containsProfanity("dasar t41"); // true
findProfanity("A*N*J*I*N*G");
clean("dasar t41"); // "dasar ***"
clean("ka$aar!"); // "***!"
```

CommonJS is supported too:

```js
const { clean, containsProfanity } = require("sopan");

containsProfanity("ta1"); // true
clean("ta1"); // "***"
```

## API

### `addWords(words)`

Adds words to the shared default filter once, so future calls to `containsProfanity`, `findProfanity`, and `clean` detect them automatically.

```ts
addWords(["kasar", "kata-baru"]);

containsProfanity("ka$aar"); // true
clean("kata-baru"); // "***"
```

### `clearWords()`

Removes words previously registered through `addWords`.

```ts
clearWords();
```

### `containsProfanity(input, options)`

Returns `true` when the input contains a profane word.

```ts
containsProfanity("ini santai"); // false
containsProfanity("ini tai"); // true
containsProfanity("ka$aar", { additionalWords: ["kasar"] }); // true
```

### `findProfanity(input, options)`

Returns match details with the configured dictionary word, raw token, normalized token, and index.

```ts
findProfanity("halo t41");
// [{ word: "tai", raw: "t41", normalized: "tai", index: 5 }]

findProfanity("ka$aar", { additionalWords: ["kasar"] });
// [{ word: "kasar", raw: "ka$aar", normalized: "kasar", index: 0 }]
```

### `clean(input, options)`

Replaces profane words with `"***"` by default.

```ts
clean("dasar t41"); // "dasar ***"
clean("dasar t41", { replacement: "[redacted]" });
clean("dasar t41", { replacement: (match) => `[${match.word}]` });
clean("ka$aar", { additionalWords: ["kasar"], replacement: "[custom]" });
```

### `createFilter(options)`

Creates a custom filter with your own word list.

```ts
const filter = createFilter({
  words: ["kasar", "contoh"] as const
});

filter.containsProfanity("ka$aar");
```

## Matching Behavior

The default filter focuses on Indonesian profanity and normalizes:

- mixed casing: `TAI`
- simple leetspeak: `t41`, `ta1`
- symbol separators: `a*n*j*i*n*g`
- repeated letters: `annjiiinggg`

Matching is token-based, so `tai` is detected while `santai` is not.

The default Indonesian word list was expanded from public Indonesian rude-word references including Wiktionary's Indonesian "kata kasar" category, a translator-maintained Indonesian profanity list, a public GitHub gist, and selected regional Indonesian references for Sundanese, Javanese, Batak, and Medan usage. It intentionally keeps only single-token words in the core package.

## Roadmap

- Expand Indonesian dictionary coverage.
- Add language packs without increasing the default bundle size.
- Add optional phrase matching for multi-word profanity.
