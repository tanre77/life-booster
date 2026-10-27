const EXACT = new Set([
  "fuck",
  "fucking",
  "fucker",
  "fucked",
  "motherfucker",
  "shit",
  "shitty",
  "bullshit",
  "shithead",
  "bitch",
  "bitches",
  "asshole",
  "asshat",
  "jackass",
  "dumbass",
  "bastard",
  "dick",
  "dickhead",
  "cock",
  "cocksucker",
  "pussy",
  "cunt",
  "whore",
  "slut",
  "fag",
  "faggot",
  "fags",
  "nigger",
  "nigga",
  "niggers",
  "retard",
  "retarded",
  "spic",
  "kike",
  "chink",
  "tranny",
  "twat",
  "wanker",
  "bollocks",
  "douche",
  "douchebag",
  "piss",
  "pissed",
  "crap",
  "damn",
  "damned",
  "dammit",
  "goddamn",
  "ass",
]);

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/\$/g, "s")
    .replace(/[^a-z]/g, "");
}

function isBad(norm: string): boolean {
  if (!norm) return false;
  if (EXACT.has(norm)) return true;
  for (const word of EXACT) {
    if (word.length < 4) continue;
    if (
      norm === `${word}s` ||
      norm === `${word}es` ||
      norm === `${word}ed` ||
      norm === `${word}ing` ||
      norm === `${word}er` ||
      norm === `${word}ers`
    ) {
      return true;
    }
  }
  return false;
}

/** Mask whole words. Does not mask the last in-progress token unless `final` is set. */
export function filterProfanity(input: string, final = false): { text: string; changed: boolean } {
  const tokens = input.split(/(\s+)/);
  let changed = false;
  const lastWord = (() => {
    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      if (tokens[i] && !/^\s+$/.test(tokens[i])) return i;
    }
    return -1;
  })();
  const text = tokens
    .map((token, index) => {
      if (!token || /^\s+$/.test(token)) return token;
      if (!final && index === lastWord && !/[.,!?;:]$/.test(token)) return token;
      const match = /^([^A-Za-z0-9@$!*|]*)([A-Za-z0-9@$!*|]+)([^A-Za-z0-9@$!*|]*)$/.exec(token);
      if (!match) return token;
      const [, lead, word, tail] = match;
      if (!isBad(normalizeToken(word))) return token;
      changed = true;
      return `${lead}${"*".repeat(word.length)}${tail}`;
    })
    .join("");
  return { text, changed };
}
