import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { deepSeekModel } from "@/lib/ai-providers";
import {
  UnifiedContentMapSchema,
  UnifiedContentSegmentSchema,
  type UnifiedContentMap,
} from "@/lib/schemas/ebook";
import { SOURCE_LOCK_RULES } from "@/lib/editorial-style-bible";

export const runtime = "nodejs";
export const maxDuration = 300;

function jsonKeepAlive<T>(work: () => Promise<T>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Keep upstream proxies from considering this request idle
      // while the model is still generating.
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(" "));
        } catch {
          // Stream may already be closed.
        }
      }, 12000);

      try {
        const payload = await work();
        controller.enqueue(encoder.encode(JSON.stringify(payload)));
      } catch (error) {
        console.error("[unified-content-map] Stream failed:", error);
        controller.enqueue(encoder.encode(JSON.stringify({
          error: "Failed to generate unified content map",
          details: error instanceof Error ? error.message : "Unknown error",
        })));
      } finally {
        clearInterval(keepAlive);
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

const UNIFIED_CONTENT_ANALYST_SYSTEM = `You are an expert content analyst extracting teaching structure from sermon transcripts.

═══════════════════════════════════════════════════════════════════
CORE MISSION
═══════════════════════════════════════════════════════════════════
Analyze the COMPLETE transcript and extract:
1. Teaching segments (natural topic boundaries)
2. Narrative arc (how the message flows from opening to conclusion)
3. Story inventory (every illustration/anecdote with unique labels)
4. Scripture positions (which verses appear where)
5. Overarching themes and thesis

═══════════════════════════════════════════════════════════════════
SPEAKER-FIDELITY MANDATE
═══════════════════════════════════════════════════════════════════
${SOURCE_LOCK_RULES}

Every key point must be:
- Explicitly stated by the speaker
- Phrased using the speaker's own words
- Directly observable in the transcript

YOU MUST NOT:
- Add theological concepts not present in the transcript
- Generalize away the speaker's specific wording
- Import doctrinal frameworks from outside the recording

═══════════════════════════════════════════════════════════════════
SEGMENT EXTRACTION RULES
═══════════════════════════════════════════════════════════════════
- Identify natural topic shifts as segment boundaries
- Each segment: 400-1200 words of teaching material (except truly short final carryover segments)
- Aim for 8-15 segments per recording (fewer for shorter messages, more for long teachings)
- Return segments in the exact order they appear within each source recording
- Skip non-teaching content: prayers, announcements, "turn to your neighbor", altar calls
- Set estimatedWordCount to the complete span of transcript represented by each segment, usually 400-1200 words
- Account for the complete transcript across the ordered segment estimates; the server attaches every source word deterministically after analysis
- Do not reproduce rawText in the analysis response
- Each segment MUST include sourceAudio mapped to the slot marker where that excerpt appears:
  [Slot-1] -> audio-1, [Slot-2] -> audio-2, ... [Slot-10] -> audio-10
- Do NOT merge content from different slot markers into a single segment.
- one segment belongs to exactly one sourceAudio value.
- COVERAGE REQUIREMENT: Segment the complete teaching transcript without gaps; do not collapse large argument blocks into tiny segment estimates.

TOPIC NAMING:
- Name segments by their teaching claim, never use structural labels
- ❌ BAD: "Introduction", "Opening", "Overview", "Conclusion"
- ✅ GOOD: "Prayer changes your countenance", "The authority of the believer"

NARRATIVE POSITION:
- opening: First 1-2 segments (problem setup, hook)
- development: Middle segments (teaching, principles, mechanisms)
- climax: Peak teaching moment (key revelation, turning point)
- resolution: Final 1-2 segments (application, call to action)

STORY INVENTORY:
- For every illustration/anecdote, create a unique label (first 80 chars of story)
- Example: "When I was in seminary, my professor told me about a man who..."
- These labels prevent the same story from appearing twice in the book

═══════════════════════════════════════════════════════════════════
SCRIPTURE & QUOTE DETECTION
═══════════════════════════════════════════════════════════════════
For every scripture or quote:
- Record exact reference (Book Ch:V) or source
- Note translation (NIV, KJV, ESV, etc.)
- Mark as blockQuote if 40+ words
- Types: "scripture" | "quote" | "proverb"

═══════════════════════════════════════════════════════════════════
SYNTHESIS RULES
═══════════════════════════════════════════════════════════════════
TEACHING ARC: Describe how the message flows (one paragraph)
Example: "Opens with the problem of prayerlessness, establishes scriptural foundation for authority, demonstrates how prayer changes circumstances, closes with practical daily application."

CORE THESIS: The single main claim (1-2 sentences)
Example: "God has given believers authority through prayer, but most Christians don't understand how to exercise it."

TARGET AUDIENCE: Who is this for?
Examples: "Young Christians struggling with doubt", "Mature believers seeking deeper prayer life", "Leaders facing spiritual warfare"

UNIQUE VOCABULARY: Terms/phrases the speaker uses repeatedly
Examples: ["anointing", "kingdom authority", "pressing in", "contend for breakthrough"]

TONE MAP: Conversational quality (3-5 adjectives)
Example: "Passionate, authoritative, encouraging, scriptural, direct"

Output all content in a single structured object.`;

const UnifiedAnalysisSchema = UnifiedContentMapSchema.extend({
  segments: z.array(UnifiedContentSegmentSchema.omit({ rawText: true })),
});

function splitTranscriptBySource(transcript: string): Map<string, string[]> {
  const wordsBySource = new Map<string, string[]>();
  let fallbackSlot = 1;

  for (const part of transcript.split(/═{3,}/)) {
    const match = part.match(/^\s*\[Slot-(\d+)\]\s*([\s\S]+)/i);
    const sourceAudio = match ? `audio-${Number(match[1])}` : `audio-${fallbackSlot}`;
    const words = (match?.[2] ?? part).trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    wordsBySource.set(sourceAudio, words);
    fallbackSlot = match ? Number(match[1]) + 1 : fallbackSlot + 1;
  }

  if (wordsBySource.size === 0) {
    wordsBySource.set("audio-1", transcript.trim().split(/\s+/).filter(Boolean));
  }
  return wordsBySource;
}

function attachCompleteSourceText(
  segments: z.infer<typeof UnifiedAnalysisSchema>["segments"],
  transcript: string,
): UnifiedContentMap["segments"] {
  const wordsBySource = splitTranscriptBySource(transcript);
  const hydratedSegments: UnifiedContentMap["segments"] = [];

  for (const [sourceAudio, sourceWords] of wordsBySource) {
    const sourceSegments = segments.filter((segment) => segment.sourceAudio === sourceAudio);
    if (sourceSegments.length === 0) {
      throw new Error(`Content map omitted ${sourceAudio}; complete source coverage is required`);
    }

    const totalWeight = sourceSegments.reduce(
      (sum, segment) => sum + Math.max(1, segment.estimatedWordCount),
      0,
    );
    let offset = 0;

    sourceSegments.forEach((segment, index) => {
      const end = index === sourceSegments.length - 1
        ? sourceWords.length
        : Math.min(
            sourceWords.length,
            offset + Math.max(1, Math.round(sourceWords.length * Math.max(1, segment.estimatedWordCount) / totalWeight)),
          );
      const rawText = sourceWords.slice(offset, end).join(" ");
      hydratedSegments.push({
        ...segment,
        rawText,
        estimatedWordCount: Math.max(1, end - offset),
      });
      offset = end;
    });
  }

  return hydratedSegments;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filteredTranscript, voiceDNA } = body;

    if (!filteredTranscript || typeof filteredTranscript !== "string") {
      return NextResponse.json(
        { error: "filteredTranscript is required and must be a string" },
        { status: 400 }
      );
    }

    const transcriptWordCount = filteredTranscript.trim().split(/\s+/).length;
    
    // Safety check: if transcript is enormous, warn but proceed
    if (transcriptWordCount > 25000) {
      console.warn(
        `[unified-content-map] Large transcript: ${transcriptWordCount} words. Consider splitting if context limit is hit.`
      );
    }

    // Verify model configuration at runtime. Provider-level guard forces v4-pro
    // if DEEPSEEK_MODEL is accidentally set to deepseek-reasoner.
    console.log(`[unified-content-map] Using model: ${deepSeekModel.modelId || "unknown"}`);

    // Build prompt with voice DNA context if available
    const voiceContext = voiceDNA
      ? `\n\nVOICE DNA (for reference):\nTone: ${voiceDNA.toneProfile}\nSignature phrases: ${voiceDNA.signaturePhrases?.slice(0, 10).join(", ") || "N/A"}\n`
      : "";

    const prompt = `${voiceContext}
COMPLETE TRANSCRIPT (${transcriptWordCount} words):

${filteredTranscript}

═══════════════════════════════════════════════════════════════════

Analyze this complete teaching transcript and extract the unified content map.
Focus on teaching segments, narrative arc, story inventory, and scripture positions.`;

    return jsonKeepAlive(async () => {
      const contentMap = await generateObject({
        model: deepSeekModel,
        schema: UnifiedAnalysisSchema,
        mode: "json",
        system: UNIFIED_CONTENT_ANALYST_SYSTEM,
        prompt,
        temperature: 0.3, // Lower temperature for more consistent extraction
        maxTokens: 16000, // Increased for richer segment extraction with fuller rawText
      });

      const normalizedSegments = attachCompleteSourceText(contentMap.object.segments, filteredTranscript).map((seg, idx) => ({
        ...seg,
        id: seg.id || `seg-${idx + 1}`,
      }));

      const segmentWordTotal = normalizedSegments.reduce(
        (sum, seg) => sum + seg.rawText.trim().split(/\s+/).filter(Boolean).length,
        0
      );
      const sourceWordTotal = [...splitTranscriptBySource(filteredTranscript).values()]
        .reduce((sum, words) => sum + words.length, 0);
      if (segmentWordTotal !== sourceWordTotal) {
        throw new Error(
          `Content map coverage mismatch (${segmentWordTotal}/${sourceWordTotal} teaching words preserved)`
        );
      }

      // Calculate total words if not provided
      const totalWords = contentMap.object.totalEstimatedWords ||
        normalizedSegments.reduce((sum, seg) => sum + seg.estimatedWordCount, 0);

      const result: UnifiedContentMap = {
        ...contentMap.object,
        segments: normalizedSegments,
        totalEstimatedWords: totalWords,
      };

      console.log(
        `[unified-content-map] Extracted ${result.segments.length} segments, ` +
        `${result.storyInventory.length} stories, ` +
        `${totalWords} estimated words, ` +
        `${segmentWordTotal} raw excerpt words, ` +
        `thesis: "${result.coreThesis.slice(0, 80)}..."`
      );

      return result;
    });
  } catch (error) {
    console.error("[unified-content-map] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to generate unified content map",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
