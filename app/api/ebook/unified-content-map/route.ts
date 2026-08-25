import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { deepSeekFlashModel } from "@/lib/ai-providers";
import { UnifiedContentMapSchema, type UnifiedContentMap } from "@/lib/schemas/ebook";
import { SOURCE_LOCK_RULES } from "@/lib/editorial-style-bible";

export const runtime = "nodejs";
export const maxDuration = 300;

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
- Each segment: 200-600 words of teaching material
- Aim for 8-15 segments per recording (fewer for shorter messages, more for long teachings)
- Skip non-teaching content: prayers, announcements, "turn to your neighbor", altar calls

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

Output all content in a single structured object. Do NOT output raw transcript text.`;

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

    const contentMap = await generateObject({
      model: deepSeekFlashModel,
      schema: UnifiedContentMapSchema,
      system: UNIFIED_CONTENT_ANALYST_SYSTEM,
      prompt,
      temperature: 0.3, // Lower temperature for more consistent extraction
    });

    // Assign sequential IDs to segments if not already set
    const normalizedSegments = contentMap.object.segments.map((seg, idx) => ({
      ...seg,
      id: seg.id || `seg-${idx + 1}`,
    }));

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
      `thesis: "${result.coreThesis.slice(0, 80)}..."`
    );

    return NextResponse.json(result);
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
