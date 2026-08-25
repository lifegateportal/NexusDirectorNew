export type CanonicalIdeaOwner = {
  id: string;
  label: string;
  chapterNumber: number;
  sectionNumber: number;
  sourceSegmentIds: string[];
};

export type ClaimRecord = {
  claim: string;
  excerptNumbers?: number[];
};

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "before", "being", "between",
  "could", "every", "from", "have", "into", "itself", "just", "more", "must",
  "only", "other", "should", "some", "such", "than", "that", "their", "them",
  "then", "there", "these", "they", "this", "through", "under", "very", "what",
  "when", "where", "which", "while", "with", "would", "your",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/\b(?:genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalms?|proverbs|ecclesiastes|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation)\s+\d+:\d+(?:-\d+)?\b/g, " ")
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));
}

function bigrams(values: string[]): Set<string> {
  const result = new Set<string>();
  for (let index = 0; index < values.length - 1; index++) {
    result.add(`${values[index]} ${values[index + 1]}`);
  }
  return result;
}

export function claimSimilarity(a: string, b: string): number {
  const aTokens = tokens(a);
  const bTokens = tokens(b);
  if (aTokens.length < 4 || bTokens.length < 4) return 0;

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  const tokenIntersection = [...aSet].filter((token) => bSet.has(token)).length;
  const tokenScore = tokenIntersection / Math.min(aSet.size, bSet.size);

  const aBigrams = bigrams(aTokens);
  const bBigrams = bigrams(bTokens);
  const bigramIntersection = [...aBigrams].filter((gram) => bBigrams.has(gram)).length;
  const bigramScore = Math.min(aBigrams.size, bBigrams.size) > 0
    ? bigramIntersection / Math.min(aBigrams.size, bBigrams.size)
    : 0;

  return tokenScore * 0.55 + bigramScore * 0.45;
}

export function extractClaimCandidates(body: string): ClaimRecord[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.match(/[^.!?]+[.!?]+/)?.[0]?.trim() ?? paragraph.trim())
    .filter((claim) => claim.split(/\s+/).length >= 6)
    .map((claim) => ({ claim, excerptNumbers: [] }));
}

export function findClaimConflicts(
  incoming: ClaimRecord[],
  existing: Array<ClaimRecord & { chapterNumber: number; sectionNumber: number }>,
  threshold = 0.80,
) {
  return incoming.flatMap((candidate) => {
    let strongest: (ClaimRecord & { chapterNumber: number; sectionNumber: number; similarity: number }) | null = null;
    for (const prior of existing) {
      const similarity = claimSimilarity(candidate.claim, prior.claim);
      if (similarity >= threshold && (!strongest || similarity > strongest.similarity)) {
        strongest = { ...prior, similarity };
      }
    }
    return strongest ? [{ incoming: candidate.claim, prior: strongest }] : [];
  });
}

export function makeCanonicalIdeaId(chapterNumber: number, sectionNumber: number, index: number): string {
  return `ch${chapterNumber}-sec${sectionNumber}-idea${index + 1}`;
}