const BLOCKED_WORDS = [
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "bastard",
  "asshole",
  "dick",
  "cunt",
  "motherfucker",
  "slut",
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const blockedPattern = `\\b(${BLOCKED_WORDS.map(escapeRegex).join("|")})\\b`;

export const hasProfanity = (input: string) => new RegExp(blockedPattern, "i").test(input);

export const sanitizeProfanity = (input: string) =>
  input.replace(new RegExp(blockedPattern, "gi"), (match) => "*".repeat(Math.max(3, match.length)));
