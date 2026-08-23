import { z } from "zod";
import type { Quote } from "@/lib/schemas/ebook";

const BIBLE_API_TRANSLATIONS = ["web", "kjv", "asv", "ylt"] as const;
const BOLLS_TRANSLATIONS = ["niv", "nlt", "nkjv", "amp", "msg", "esv", "nasb", "csb"] as const;
export const SUPPORTED_SCRIPTURE_TRANSLATIONS = [
  ...BIBLE_API_TRANSLATIONS,
  ...BOLLS_TRANSLATIONS,
] as const;

export type ScriptureTranslation = (typeof SUPPORTED_SCRIPTURE_TRANSLATIONS)[number];

const BOLLS_CODE: Record<(typeof BOLLS_TRANSLATIONS)[number], string> = {
  niv: "NIV",
  nlt: "NLT",
  nkjv: "NKJV",
  amp: "AMP",
  msg: "MSG",
  esv: "ESV",
  nasb: "NASB",
  csb: "CSB17",
};

const TRANSLATION_ALIASES: Record<string, ScriptureTranslation> = {
  web: "web",
  kjv: "kjv",
  asv: "asv",
  ylt: "ylt",
  niv: "niv",
  nlt: "nlt",
  nkjv: "nkjv",
  amp: "amp",
  amplified: "amp",
  msg: "msg",
  message: "msg",
  esv: "esv",
  nasb: "nasb",
  csb: "csb",
  csb17: "csb",
};

const BOOK_IDS: Record<string, number> = {
  genesis: 1, exodus: 2, leviticus: 3, numbers: 4, deuteronomy: 5,
  joshua: 6, judges: 7, ruth: 8, "1 samuel": 9, "2 samuel": 10,
  "1 kings": 11, "2 kings": 12, "1 chronicles": 13, "2 chronicles": 14,
  ezra: 15, nehemiah: 16, esther: 17, job: 18,
  psalms: 19, psalm: 19, proverbs: 20, ecclesiastes: 21,
  "song of solomon": 22, "song of songs": 22,
  isaiah: 23, jeremiah: 24, lamentations: 25, ezekiel: 26,
  daniel: 27, hosea: 28, joel: 29, amos: 30, obadiah: 31,
  jonah: 32, micah: 33, nahum: 34, habakkuk: 35, zephaniah: 36,
  haggai: 37, zechariah: 38, malachi: 39,
  matthew: 40, mark: 41, luke: 42, john: 43, acts: 44, romans: 45,
  "1 corinthians": 46, "2 corinthians": 47,
  galatians: 48, ephesians: 49, philippians: 50, colossians: 51,
  "1 thessalonians": 52, "2 thessalonians": 53,
  "1 timothy": 54, "2 timothy": 55,
  titus: 56, philemon: 57, hebrews: 58, james: 59,
  "1 peter": 60, "2 peter": 61,
  "1 john": 62, "2 john": 63, "3 john": 64,
  jude: 65, revelation: 66,
};

export const ScriptureRequestSchema = z.object({
  reference: z.string().trim().min(2).max(140),
  translation: z.string().trim().default("web"),
  returnVerses: z.boolean().default(false),
});

export type VerifiedScripture = {
  reference: string;
  translation: string;
  text: string;
  verses?: Array<{ ref: string; text: string }>;
  source: "bible-api.com" | "bolls.life";
  sourceUrl: string;
  verifiedAt: string;
};

type BibleApiVerse = { book_name: string; chapter: number; verse: number; text: string };
type BibleApiResponse = { reference?: string; text?: string; error?: string; verses?: BibleApiVerse[] };

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function parseReference(reference: string) {
  const match = reference.trim().match(/^((?:[1-3]\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const start = Number.parseInt(match[3], 10);
  return {
    book: match[1].trim(),
    chapter: Number.parseInt(match[2], 10),
    start,
    end: match[4] ? Number.parseInt(match[4], 10) : start,
  };
}

export function normalizeScriptureTranslation(value?: string): ScriptureTranslation {
  const normalized = (value ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!normalized) return "web";
  const translation = TRANSLATION_ALIASES[normalized];
  if (!translation) throw new Error(`Unsupported live Scripture translation: ${value}`);
  return translation;
}

export function extractScriptureReferences(text: string): string[] {
  const matches = text.match(/\b(?:[1-3]\s+)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+:\d+(?:-\d+)?\b/gi) ?? [];
  return [...new Set(matches.map((reference) => reference.replace(/\s+/g, " ").trim()))];
}

async function fetchFromBolls(
  reference: string,
  translation: (typeof BOLLS_TRANSLATIONS)[number],
  returnVerses: boolean,
): Promise<VerifiedScripture | null> {
  const parsed = parseReference(reference);
  if (!parsed) return null;
  const bookId = BOOK_IDS[parsed.book.toLowerCase()];
  if (!bookId) return null;
  const code = BOLLS_CODE[translation];
  const sourceUrl = `https://bolls.life/get-text/${code}/${bookId}/${parsed.chapter}/`;
  const response = await fetch(sourceUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json() as Array<{ verse: number; text: string }>;
  const filtered = data.filter((verse) => verse.verse >= parsed.start && verse.verse <= parsed.end);
  if (filtered.length !== parsed.end - parsed.start + 1) return null;
  const verses = filtered.map((verse) => ({
    ref: `${parsed.book} ${parsed.chapter}:${verse.verse}`,
    text: stripHtml(verse.text.replace(/\n+/g, " ")),
  }));
  return {
    reference: parsed.start === parsed.end
      ? `${parsed.book} ${parsed.chapter}:${parsed.start}`
      : `${parsed.book} ${parsed.chapter}:${parsed.start}-${parsed.end}`,
    translation: code,
    text: verses.map((verse) => verse.text).join(" "),
    verses: returnVerses ? verses : undefined,
    source: "bolls.life",
    sourceUrl,
    verifiedAt: new Date().toISOString(),
  };
}

const SCRIPTURE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SCRIPTURE_CACHE_MAX_ENTRIES = 500;
const scriptureCache = new Map<string, { expiresAt: number; result: Promise<VerifiedScripture> }>();

async function fetchVerifiedScriptureUncached(input: {
  reference: string;
  translation?: string;
  returnVerses?: boolean;
}): Promise<VerifiedScripture> {
  const reference = input.reference.trim();
  const translation = normalizeScriptureTranslation(input.translation);
  const returnVerses = input.returnVerses ?? false;

  if ((BOLLS_TRANSLATIONS as readonly string[]).includes(translation)) {
    const result = await fetchFromBolls(
      reference,
      translation as (typeof BOLLS_TRANSLATIONS)[number],
      returnVerses,
    );
    if (!result) throw new Error(`Scripture not found: ${reference} (${translation.toUpperCase()})`);
    return result;
  }

  const encoded = encodeURIComponent(reference.replace(/\s+/g, "+"));
  const sourceUrl = `https://bible-api.com/${encoded}?translation=${translation}`;
  const response = await fetch(sourceUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Scripture not found: ${reference} (${translation.toUpperCase()})`);
  const data = await response.json() as BibleApiResponse;
  if (data.error || !data.text) throw new Error(data.error ?? `No Scripture text returned for ${reference}`);
  const verses = (data.verses ?? []).map((verse) => ({
    ref: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
    text: verse.text.replace(/\n+/g, " ").trim(),
  }));
  return {
    reference: data.reference ?? reference,
    translation: translation.toUpperCase(),
    text: data.text.replace(/\n+/g, " ").trim(),
    verses: returnVerses && verses.length > 0 ? verses : undefined,
    source: "bible-api.com",
    sourceUrl,
    verifiedAt: new Date().toISOString(),
  };
}

export async function fetchVerifiedScripture(input: {
  reference: string;
  translation?: string;
  returnVerses?: boolean;
}): Promise<VerifiedScripture> {
  const translation = normalizeScriptureTranslation(input.translation);
  const normalizedReference = input.reference.toLowerCase().replace(/\s+/g, " ").trim();
  const cacheKey = `${translation}:${normalizedReference}:${input.returnVerses ? "verses" : "text"}`;
  const now = Date.now();
  const cached = scriptureCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.result;
  if (cached) scriptureCache.delete(cacheKey);

  const result = fetchVerifiedScriptureUncached({ ...input, translation }).catch((error) => {
    scriptureCache.delete(cacheKey);
    throw error;
  });
  scriptureCache.set(cacheKey, { expiresAt: now + SCRIPTURE_CACHE_TTL_MS, result });

  if (scriptureCache.size > SCRIPTURE_CACHE_MAX_ENTRIES) {
    const oldestKey = scriptureCache.keys().next().value as string | undefined;
    if (oldestKey) scriptureCache.delete(oldestKey);
  }
  return result;
}

function referenceKey(reference: string): string {
  return reference.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function hydrateScriptureQuotes(input: {
  quotes: Quote[];
  sourceTexts: string[];
  defaultTranslation?: string;
}): Promise<Quote[]> {
  const existingScriptures = input.quotes.filter(
    (quote) => quote.type === "scripture" && quote.reference.trim().length > 0,
  );
  const nonScriptures = input.quotes.filter((quote) => quote.type !== "scripture");
  const byReference = new Map(existingScriptures.map((quote) => [referenceKey(quote.reference), quote]));

  for (const reference of extractScriptureReferences(input.sourceTexts.join("\n"))) {
    const key = referenceKey(reference);
    if (!byReference.has(key)) {
      byReference.set(key, {
        id: `live-scripture-${key.replace(/[^a-z0-9]+/g, "-")}`,
        text: "",
        reference,
        translation: input.defaultTranslation ?? "WEB",
        type: "scripture",
        isBlockQuote: false,
        verified: false,
      });
    }
  }

  const verifiedScriptures = await Promise.all(
    [...byReference.values()].map(async (quote) => {
      const verified = await fetchVerifiedScripture({
        reference: quote.reference,
        translation: quote.translation || input.defaultTranslation || "WEB",
      });
      return {
        ...quote,
        text: verified.text,
        reference: verified.reference,
        translation: verified.translation,
        isBlockQuote: verified.text.split(/\s+/).filter(Boolean).length >= 40,
        verified: true,
        verificationSource: verified.source,
        verificationUrl: verified.sourceUrl,
        verifiedAt: verified.verifiedAt,
      } satisfies Quote;
    }),
  );

  return [...nonScriptures, ...verifiedScriptures];
}