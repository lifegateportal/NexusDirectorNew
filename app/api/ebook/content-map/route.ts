import { NextRequest, NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { deepSeekModel } from "@/lib/ai-providers";
import { ContentMapRequestSchema, QuoteSchema } from "@/lib/schemas/ebook";

export const runtime = "nodejs";
export const maxDuration = 300;

// Max words to send to the LLM per slot.
// 12 000 covers the vast majority of sermon recordings (~60–90 min) without
// hitting DeepSeek's context limit, and prevents the truncation that was causing
// the last ~37 % of each slot to be invisble to segment extraction.
const MAX_SLOT_WORDS = 12000;
const MAX_CONCURRENT_EXTRACTIONS = 5;
const EXTRACTION_MAX_TOKENS = 3000;
const SYNTHESIS_MAX_TOKENS = 1200;
const EXTRACTION_TIMEOUT_MS = 240_000;
const SYNTHESIS_TIMEOUT_MS = 180_000;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runWorker()),
  );
  return results;
}

// Per-slot extraction schema — NO rawText (LLM must not copy back large text blobs)
const SlotSegmentExtractSchema = z.object({
  topic: z.string(),
  keyPoints: z.array(z.string()).default([]),
  quotes: z.array(
    z.object({
      text: z.string(),
      reference: z.string(),
      translation: z.string(),
      type: z.enum(["scripture", "quote", "proverb"]),
      isBlockQuote: z.boolean(),
    })
  ).default([]),
  estimatedWordCount: z.number(),
});

const SlotSegmentsSchema = z.object({
  segments: z.array(SlotSegmentExtractSchema),
});

// Final synthesis schema (receives only topics/themes, no raw text)
const SynthesisSchema = z.object({
  totalEstimatedWords: z.number(),
  overarchingThemes: z.array(z.string()).default([]),
  teachingArc: z.string().default(""),
  coreThesis: z.string().default(""),
  targetAudience: z.string().default(""),
  uniqueVocabulary: z.array(z.string()).default([]),
  toneMap: z.string().default(""),
});

const SourceAudioSchema = z.enum([
  "audio-1", "audio-2", "audio-3", "audio-4", "audio-5",
  "audio-6", "audio-7", "audio-8", "audio-9", "audio-10",
]);

const ExtractSlotRequestSchema = z.object({
  operation: z.literal("extract-slot"),
  sourceAudio: SourceAudioSchema,
  transcript: z.string().min(100),
});

const SynthesizeRequestSchema = z.object({
  operation: z.literal("synthesize"),
  segments: z.array(z.object({
    sourceAudio: SourceAudioSchema,
    topic: z.string(),
    keyPoints: z.array(z.string()).default([]),
    estimatedWordCount: z.number(),
  })).min(1),
});

const SEGMENT_SYSTEM = `You are a content analyst extracting teaching segments from a single sermon/teaching recording.

════════════════════════════════════════════
SPEAKER-FIDELITY MANDATE — READ FIRST
════════════════════════════════════════════
You are cataloguing the SPEAKER'S material only. Every key point you extract must be:
  - Explicitly stated or demonstrated by the speaker in this transcript
  - Phrased using the speaker's own words and concepts
  - Directly observable in the provided text — not inferred, interpolated, or generalized

YOU MUST NOT:
  - Add points the speaker did not make
  - Summarize away nuance or add editorial framing
  - Introduce theological, doctrinal, or practical concepts not in the transcript
  - Merge ideas from outside the recording to "fill gaps"

════════════════════════════════════════════
NON-TEACHING CONTENT — SKIP ENTIRELY
════════════════════════════════════════════
Do NOT create segments from:
  - Opening or closing prayers / benedictions
  - Announcements, event notices, giving appeals, offering moments
  - "Good morning", "welcome", "turn to your neighbor" instructions
  - Altar calls or sinner's prayer recitations
  - Technical interruptions (mic check, applause breaks)
  - Repeated monthly-theme or previous-message recap lines that add no new teaching substance
  - Jokes or stories with no direct teaching application
  - Any content already stripped by the signal filter

If such content appears in the transcript, mark the segment topic as "[NON-TEACHING — SKIP]"
and set estimatedWordCount to 0. The architect will discard these automatically.

════════════════════════════════════════════
SEGMENT RULES
════════════════════════════════════════════
- Identify natural topic shifts as segment boundaries
- keyPoints: exact claims made in that segment — use the speaker's own words
- Aim for 3–8 segments per recording, each covering 200–600 words of teaching material
- TOPIC NAMING: Name every segment by its actual teaching claim. NEVER use structural labels like "Introduction", "Introduction:", "Intro", "Overview", "Opening", or "Conclusion" as the topic — not even as a prefix. Name the specific idea being taught (e.g. "Prayer changes your countenance", not "Introduction: Prayer").

════════════════════════════════════════════
SCRIPTURE / QUOTE DETECTION
════════════════════════════════════════════
For every scripture or quote mentioned:
- type: "scripture" | "quote" | "proverb"
- text: exact words as spoken
- reference: "Book Ch:V" for scripture, "Author, Source" for quotes, "" otherwise
- translation: NIV / KJV / ESV etc., "" if not stated
- isBlockQuote: true if 40+ words

DO NOT reproduce large blocks of transcript text. Focus on structure and meaning.`;

function parseJsonObject(raw: string): unknown {
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const start = text.indexOf("{");
  if (start < 0) throw new Error("No JSON object found in model response");

  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") stack.push("}");
    else if (char === "[") stack.push("]");
    else if (char === "}" || char === "]") {
      const expected = stack.pop();
      if (expected !== char) continue;
      if (stack.length === 0) return JSON.parse(text.slice(start, index + 1));
    }
  }

  let repaired = text.slice(start).trim();
  if (inString && !escaped) repaired += '"';
  repaired += stack.slice().reverse().join("");
  return JSON.parse(repaired.replace(/,\s*([}\]])/g, "$1"));
}

async function generateStructuredObject<TSchema extends z.ZodTypeAny>(options: {
  schema: TSchema;
  system: string;
  prompt: string;
  maxTokens: number;
  timeoutMs: number;
}): Promise<z.output<TSchema>> {
  try {
    const { object } = await generateObject({
      model: deepSeekModel,
      schema: options.schema,
      mode: "json",
      temperature: 0.2,
      maxTokens: options.maxTokens,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(options.timeoutMs),
      system: options.system,
      prompt: options.prompt,
    });
    return options.schema.parse(object);
  } catch (objectError) {
    const message = objectError instanceof Error ? objectError.message.toLowerCase() : "";
    const isTimeout = objectError instanceof Error && (
      objectError.name === "AbortError" ||
      message.includes("abort") ||
      message.includes("timed out") ||
      message.includes("timeout")
    );
    if (isTimeout) throw objectError;
    console.warn("[content-map] Structured output failed; retrying as strict JSON text:", objectError);
    const { text } = await generateText({
      model: deepSeekModel,
      temperature: 0.2,
      maxTokens: options.maxTokens,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(options.timeoutMs),
      system: `${options.system}\n\nReturn ONLY one valid JSON object matching the requested schema. No markdown fences or commentary.`,
      prompt: options.prompt,
    });
    return options.schema.parse(parseJsonObject(text));
  }
}

async function extractSlot(sourceAudio: z.infer<typeof SourceAudioSchema>, transcript: string) {
  const slotWords = transcript.split(/\s+/).filter(Boolean);
  const ranges: Array<{ start: number; end: number }> = [];
  const overlap = 200;
  let start = 0;
  while (start < slotWords.length) {
    const end = Math.min(start + MAX_SLOT_WORDS, slotWords.length);
    ranges.push({ start, end });
    if (end === slotWords.length) break;
    start = end - overlap;
  }

  const chunkSegments: z.infer<typeof SlotSegmentExtractSchema>[][] = [];
  for (const range of ranges) {
    const chunkText = slotWords.slice(range.start, range.end).join(" ");
    const object = await generateStructuredObject({
      schema: SlotSegmentsSchema,
      maxTokens: EXTRACTION_MAX_TOKENS,
      timeoutMs: EXTRACTION_TIMEOUT_MS,
      system: SEGMENT_SYSTEM,
      prompt: `Extract all teaching segments from this recording (${sourceAudio}). Return {"segments":[{"topic":string,"keyPoints":string[],"quotes":[{"text":string,"reference":string,"translation":string,"type":"scripture"|"quote"|"proverb","isBlockQuote":boolean}],"estimatedWordCount":number}]}.\n\n${chunkText}`,
    });
    chunkSegments.push(object.segments);
  }

  const seenTopics = new Set<string>();
  const extracted = chunkSegments
    .flat()
    .filter((segment) => !segment.topic.includes("[NON-TEACHING") && segment.estimatedWordCount > 0)
    .filter((segment) => {
      const key = segment.topic.toLowerCase().trim().slice(0, 60);
      if (seenTopics.has(key)) return false;
      seenTopics.add(key);
      return true;
    });
  if (extracted.length === 0) {
    throw new Error(`${sourceAudio} returned no teaching segments`);
  }

  const totalEstimatedWords = extracted.reduce(
    (sum, segment) => sum + Math.max(1, segment.estimatedWordCount),
    0,
  );
  let wordOffset = 0;
  let quoteCounter = 1;
  const allQuotes: Array<z.infer<typeof QuoteSchema>> = [];
  const segments = extracted.map((segment, index) => {
    const sliceLength = index === extracted.length - 1
      ? slotWords.length - wordOffset
      : Math.round(slotWords.length * (Math.max(1, segment.estimatedWordCount) / totalEstimatedWords));
    const rawText = slotWords.slice(wordOffset, wordOffset + sliceLength).join(" ");
    wordOffset += sliceLength;
    const quotes = segment.quotes.map((quote) => {
      const hydrated = {
        ...quote,
        id: `q-${sourceAudio}-${quoteCounter++}`,
        verified: false,
      };
      allQuotes.push(hydrated);
      return hydrated;
    });
    return {
      id: `seg-${sourceAudio}-${index + 1}`,
      sourceAudio,
      topic: segment.topic,
      rawText,
      keyPoints: segment.keyPoints,
      quotes,
      estimatedWordCount: rawText.split(/\s+/).filter(Boolean).length,
    };
  });

  return { sourceAudio, segments, allQuotes };
}

async function synthesizeSegments(segments: z.infer<typeof SynthesizeRequestSchema>["segments"]) {
  const topicSummary = segments
    .map((segment) => `- [${segment.sourceAudio}] ${segment.topic}: ${segment.keyPoints.join("; ")}`)
    .join("\n");
  return generateStructuredObject({
    schema: SynthesisSchema,
    maxTokens: SYNTHESIS_MAX_TOKENS,
    timeoutMs: SYNTHESIS_TIMEOUT_MS,
    system: `You are a senior editor identifying the overarching message of a multi-part teaching series.
Base your synthesis ONLY on what the speaker explicitly taught. Identify the narrative north star, actual target audience, unique vocabulary, tone map, and coherent teaching arc. Consolidate recurring series recaps rather than treating them as new material.`,
    prompt: `Synthesize these source-grounded teaching segments. Return {"totalEstimatedWords":number,"overarchingThemes":string[],"teachingArc":string,"coreThesis":string,"targetAudience":string,"uniqueVocabulary":string[],"toneMap":string}.\n\n${topicSummary}`,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as unknown;
  if (body && typeof body === "object" && "operation" in body) {
    try {
      if ((body as { operation?: unknown }).operation === "extract-slot") {
        const input = ExtractSlotRequestSchema.parse(body);
        return NextResponse.json(await extractSlot(input.sourceAudio, input.transcript), { status: 200 });
      }
      if ((body as { operation?: unknown }).operation === "synthesize") {
        const input = SynthesizeRequestSchema.parse(body);
        return NextResponse.json(await synthesizeSegments(input.segments), { status: 200 });
      }
      return NextResponse.json({ error: "Unsupported content-map operation" }, { status: 400 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Content-map operation failed";
      const operation = (body as { operation?: unknown }).operation;
      const source = operation === "extract-slot" && "sourceAudio" in body
        ? ` for ${String((body as { sourceAudio?: unknown }).sourceAudio)}`
        : "";
      return NextResponse.json({
        route: "ebook/content-map",
        error: `Content-map ${String(operation)} failed${source}`,
        details: message,
      }, { status: err instanceof z.ZodError ? 400 : 500 });
    }
  }

  let input;
  try {
    input = ContentMapRequestSchema.parse(body);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid input" }, { status: 400 });
  }

  try {
    // ── 1. Split masterTranscript into per-slot chunks ──────────────────────
    const slotChunks: { sourceAudio: string; text: string }[] = [];
    const parts = input.masterTranscript.split(/═{3,}/);
    let nextSlotFallback = 1; // used when [Slot-N] header was stripped by filter-signal
    for (const part of parts) {
      // A1: Skip slots tagged as non-teaching by the signal filter (tagNonTeachingSlots pass)
      if (/^\s*\[NON-TEACHING-SLOT-\d+\]/i.test(part)) continue;
      const m = part.match(/^\s*\[Slot-(\d+)\]\s*([\s\S]+)/);
      if (!m) {
        // The [Slot-1] label may have been removed by the signal filter when it
        // trimmed opening prayers/greetings that preceded the teaching start phrase.
        // Don't silently skip — assign to the next expected slot number.
        const content = part.trim();
        if (!content) continue; // genuinely empty separator between slots
        slotChunks.push({ sourceAudio: `audio-${nextSlotFallback}`, text: content });
        continue;
      }
      const slotNum = parseInt(m[1], 10);
      nextSlotFallback = slotNum + 1;
      slotChunks.push({ sourceAudio: `audio-${slotNum}`, text: m[2].trim() });
    }

    if (slotChunks.length === 0) {
      slotChunks.push({ sourceAudio: "audio-1", text: input.masterTranscript });
    }

    // ── 2. Extract segments per slot — all slots processed in parallel ───────
    // Processing slots sequentially caused reverse-proxy timeouts on large projects
    // (10 slots × 5 chunks × ~4s/call ≈ 200 s). Parallel execution cuts wall-clock
    // time to roughly that of the single slowest slot (~20–30 s).

    type DedupedSlotResult = {
      chunk: { sourceAudio: string; text: string };
      slotWords: string[];
      dedupedSegs: z.infer<typeof SlotSegmentExtractSchema>[];
      error?: string;
    };

    const extractionTasks = slotChunks.flatMap((chunk) => {
      const slotWords = chunk.text.split(/\s+/);
      const ranges: Array<{ start: number; end: number }> = [];
      const overlap = 200;
      let start = 0;
      while (start < slotWords.length) {
        const end = Math.min(start + MAX_SLOT_WORDS, slotWords.length);
        ranges.push({ start, end });
        if (end === slotWords.length) break;
        start = end - overlap;
      }
      return ranges.map((range) => ({ chunk, slotWords, range }));
    });

    const extractionResults = await mapWithConcurrency(
      extractionTasks,
      MAX_CONCURRENT_EXTRACTIONS,
      async ({ chunk, slotWords, range }) => {
        try {
          const chunkText = slotWords.slice(range.start, range.end).join(" ");
          const { object } = await generateObject({
            model: deepSeekModel,
            schema: SlotSegmentsSchema,
            mode: "json",
            temperature: 0.2,
            maxTokens: EXTRACTION_MAX_TOKENS,
            maxRetries: 1,
            abortSignal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
            system: SEGMENT_SYSTEM,
            prompt: `Extract all teaching segments from this recording (${chunk.sourceAudio}):\n\n${chunkText}`,
          });
          return { sourceAudio: chunk.sourceAudio, segments: object.segments };
        } catch (error) {
          return {
            sourceAudio: chunk.sourceAudio,
            segments: [],
            error: error instanceof Error ? error.message : "Unknown extraction failure",
          };
        }
      },
    );

    const slotResults: DedupedSlotResult[] = slotChunks.map((chunk) => {
      const slotWords = chunk.text.split(/\s+/);
      const results = extractionResults.filter((result) => result.sourceAudio === chunk.sourceAudio);
      const failed = results.find((result) => result.error);
      if (failed) {
        console.error(`[content-map] Slot ${chunk.sourceAudio} failed: ${failed.error}`);
        return { chunk, slotWords, dedupedSegs: [], error: failed.error };
      }

      const rawSegmentsForSlot = results.flatMap((result) => result.segments);

      // Deduplicate segments that appeared in overlapping chunk windows.
      const seenSegTopics = new Set<string>();
      const dedupedSegs = rawSegmentsForSlot.filter((seg) => {
        const key = seg.topic.toLowerCase().trim().slice(0, 60);
        if (seenSegTopics.has(key)) return false;
        seenSegTopics.add(key);
        return true;
      });

      return { chunk, slotWords, dedupedSegs };
    });

    const failedSlots = slotResults.filter((result) => result.error);
    if (failedSlots.length > 0) {
      throw new Error(
        `Content extraction failed for ${failedSlots.map((result) => result.chunk.sourceAudio).join(", ")}. No recordings were discarded; retry this stage.`,
      );
    }

    // ── Assemble segments sequentially so IDs are deterministic ──────────────
    let segmentIdCounter = 1;
    const allSegments: Array<{
      id: string;
      sourceAudio: string;
      topic: string;
      rawText: string;
      keyPoints: string[];
      quotes: Array<{ id: string; text: string; reference: string; translation: string; type: "scripture" | "quote" | "proverb"; isBlockQuote: boolean }>;
      estimatedWordCount: number;
    }> = [];

    const allQuotes: Array<{ id: string; text: string; reference: string; translation: string; type: "scripture" | "quote" | "proverb"; isBlockQuote: boolean }> = [];

    for (const { chunk, slotWords, dedupedSegs } of slotResults) {
      // Distribute the full slot text across segments proportionally.
      const totalEstimatedWords = dedupedSegs.reduce((sum, s) => sum + Math.max(1, s.estimatedWordCount), 0) || 1;
      let wordOffset = 0;
      const lastSegIdx = dedupedSegs.length - 1;

      for (let si = 0; si < dedupedSegs.length; si++) {
        const seg = dedupedSegs[si];
        const id = `seg-${segmentIdCounter++}`;
        const segWordCount = Math.max(1, seg.estimatedWordCount);
        const sliceFraction = segWordCount / totalEstimatedWords;
        const sliceLen = si === lastSegIdx
          ? slotWords.length - wordOffset
          : Math.round(slotWords.length * sliceFraction);
        const rawText = slotWords.slice(wordOffset, wordOffset + sliceLen).join(" ");
        wordOffset += sliceLen;

        const actualWordCount = rawText.split(/\s+/).filter(Boolean).length;

        const quotes = (seg.quotes ?? []).map((q, qi) => ({
          ...q,
          id: `q-${allQuotes.length + qi + 1}`,
        }));

        allSegments.push({
          id,
          sourceAudio: chunk.sourceAudio,
          topic: seg.topic,
          rawText,
          keyPoints: seg.keyPoints,
          quotes,
          estimatedWordCount: actualWordCount,
        });

        allQuotes.push(...quotes);
      }
    }

    // ── 3. Synthesise themes/arc from segment topics only (no rawText) ──────
    // Strip any non-teaching segments the LLM flagged before synthesis and export
    const teachingSegments = allSegments.filter(
      (s) => !s.topic.includes("[NON-TEACHING") && s.estimatedWordCount > 0
    );

    const topicSummary = teachingSegments
      .map((s) => `- [${s.sourceAudio}] ${s.topic}: ${s.keyPoints.join("; ")}`)
      .join("\n");

    const { object: synthesis } = await generateObject({
      model: deepSeekModel,
      schema: SynthesisSchema,
      mode: "json",
      temperature: 0.2,
      maxTokens: SYNTHESIS_MAX_TOKENS,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(SYNTHESIS_TIMEOUT_MS),
      system: `You are a senior editor identifying the overarching message of a multi-part teaching series.
    Base your synthesis ONLY on what the speaker explicitly taught — do not add external theological context.

    Your job is to perform the sermon-to-book "Narrative North Star" pass:
    - Extract the core thesis that governs the whole manuscript.
    - Identify the target audience the speaker is actually addressing in substance, not the live room.
    - Capture the speaker's unique vocabulary, metaphors, and repeated conceptual language.
    - Describe the tone map for the eventual book.
    - Organize recurring ideas into a coherent flow, treating repeated series recaps or monthly-theme refreshers as support material rather than fresh chapters.`,
      prompt: `Based on these teaching segment topics, identify the overall themes, teaching arc, core thesis, target audience, unique vocabulary, and tone map.

    Group repeated themes together conceptually so the eventual book reads contiguously instead of repeating sermon-series refreshers.

    ${topicSummary}`,
    });

    const contentMap = {
      ...synthesis,
      segments: teachingSegments,
      allQuotes,
    };

    return NextResponse.json(contentMap, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Content mapping failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

