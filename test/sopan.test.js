import assert from "node:assert/strict";
import test from "node:test";
import {
  addWords,
  clean,
  clearWords,
  containsProfanity,
  createFilter,
  findProfanity
} from "../dist/esm/index.js";

test("detects exact Indonesian profanity", () => {
  assert.equal(containsProfanity("dasar tai"), true);
  assert.equal(containsProfanity("dasar bacot"), true);
  assert.equal(containsProfanity("dia sinting"), true);
  assert.equal(containsProfanity("ini santai saja"), false);
});

test("detects regional Indonesian rude words", () => {
  assert.equal(containsProfanity("dasar kehed"), true);
  assert.equal(containsProfanity("ojo nggateli"), true);
  assert.equal(containsProfanity("itu bujanginam"), true);
});

test("detects casing, repeated letters, symbols, and leetspeak", () => {
  assert.equal(containsProfanity("A*N*J*I*N*G"), true);
  assert.equal(containsProfanity("annjiiinggg"), true);
  assert.equal(containsProfanity("t41"), true);
  assert.equal(containsProfanity("ta1"), true);
});

test("returns match details", () => {
  const [match] = findProfanity("halo t41!");

  assert.deepEqual(match, {
    word: "tai",
    raw: "t41",
    normalized: "tai",
    index: 5
  });
});

test("cleans matches with a string replacement", () => {
  assert.equal(clean("dasar t41"), "dasar ***");
});

test("cleans matches with a callback replacement", () => {
  assert.equal(clean("dasar t41", { replacement: (match) => `[${match.word}]` }), "dasar [tai]");
});

test("accepts additional words in the default helpers", () => {
  const options = { additionalWords: ["kasar"] };

  assert.equal(containsProfanity("ka$aar", options), true);
  assert.deepEqual(findProfanity("ka$aar", options)[0], {
    word: "kasar",
    raw: "ka$aar",
    normalized: "kasar",
    index: 0
  });
  assert.equal(clean("ka$aar", { ...options, replacement: "[custom]" }), "[custom]");
});

test("adds shared words once for default helpers", () => {
  clearWords();
  addWords(["kasar"]);

  assert.equal(containsProfanity("ka$aar"), true);
  assert.equal(findProfanity("ka$aar")[0]?.word, "kasar");
  assert.equal(clean("ka$aar!"), "***!");

  clearWords();
  assert.equal(containsProfanity("ka$aar"), false);
});

test("creates custom typed filters", () => {
  const filter = createFilter({ words: ["kasar"] });

  assert.equal(filter.containsProfanity("ka$aar"), true);
  assert.equal(filter.clean("ka$aar", { replacement: "[redacted]" }), "[redacted]");
});
