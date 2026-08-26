import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { deepSeekChatModel } from "@/lib/ai-providers";
import { VoiceDNASchema, VoiceDNARequestSchema } from "@/lib/schemas/ebook";

export const runtime = "nodejs";
export const maxDuration = 120;

function parseJsonObject(raw: string): unknown {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Voice DNA model response did not contain a complete JSON object");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

function ensureToneProfile(dna: unknown) {
  const parsed = VoiceDNASchema.parse(dna);
  if (parsed.toneProfile.trim()) return parsed;

  return {
    ...parsed,
    toneProfile: "direct, clear, pastoral",
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json() as unknown;
  let input;
  try {
    input = VoiceDNARequestSchema.parse(body);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid input" }, { status: 400 });
  }

  // Lighter distributed sample to keep route reliably under gateway time limits.
  const words = input.masterTranscript.split(/\s+/);
  const total = words.length;
  const startSample = words.slice(0, 300).join(" ");
  const midStart = Math.max(300, Math.floor(total / 2) - 150);
  const midSample = words.slice(midStart, midStart + 300).join(" ");
  const endSample = words.slice(Math.max(0, total - 300)).join(" ");
  const sampleTranscript = [
    "[START]\n" + startSample,
    "[MIDDLE]\n" + midSample,
    "[END]\n" + endSample,
  ].join("\n\n---\n\n");

  const systemPrompt = `You are a master linguist and voice analyst who profiles published authors for professional ghostwriting engagements.
Your task: extract a precise, multi-dimensional Voice DNA from the provided transcript sample.

CARDINAL RULE: Extract ONLY patterns directly evidenced in this transcript.
Do not invent, infer, or generalize. Every entry must be traceable to actual words present.

═══════════════════════════════════
ARRAY SIZE LIMITS — strictly enforced
═══════════════════════════════════
- signaturePhrases: max 8 (verbatim repeated phrases, min 2 occurrences)
- preferredTerminology: max 10 (domain-specific vocabulary used consistently)
- rhetoricalPatterns: max 6 (teaching devices actually observed)
- avoidWords: max 30 (baseline 22 + up to 8 author-specific)
- vernacularMarkers: max 10 (community idioms that must appear verbatim)
- avoidStructures: max 10 (sentence-level structural patterns the author never uses)

═══════════════════════════════════
FIELD DEFINITIONS
═══════════════════════════════════
signaturePhrases
  Exact phrases repeated at least twice. Quote verbatim.

preferredTerminology
  Domain-specific words or concepts this author consistently chooses.

toneProfile
  One concise string capturing the emotional and relational tone.
  Example: "pastoral, direct, warm" or "authoritative, scholarly, measured"

sentencePattern
  Must be exactly one of: "short-punchy", "long-explanatory", or "mixed"

rhetoricalPatterns
  Observed teaching devices. Examples: "repeats key point three times", "uses rhetorical questions", "call-and-response structure"

teachingStyle
  How the author opens new topics, builds the argument, and lands the point.
  One to three sentences of observed behavior.

avoidWords
  Return only words or phrases the author demonstrably avoids. Maximum 8.

vocabularyLevel
  Must be exactly one of: "conversational", "pastoral", "academic", "technical"
  Choose the single best match for this author's dominant register.

pacingFingerprint
  One sentence describing their rhythm and momentum pattern.

narrativeDevice
  How the author structures stories and illustrations.

emotionalArc
  The emotional modulation across a typical teaching unit.

vernacularMarkers
  Community-specific phrases or idioms that are a signature of this author's culture and must appear verbatim to authenticate voice.
  If none are present, return an empty array.

avoidStructures
  Sentence-level construction patterns the author never uses.

openingPattern
  How the author launches a new point or section.

closingPattern
  How the author lands and seals a point.`;

  const userPrompt = `Extract the author's Voice DNA from this transcript sample:\n\n${sampleTranscript}`;

  try {
    const result = await generateText({
      model: deepSeekChatModel,
      temperature: 0.1,
      maxTokens: 2200,
      system: `${systemPrompt}\n\nReturn exactly one valid JSON object. Do not use markdown or include commentary.`,
      prompt: `${userPrompt}\n\nRequired keys: signaturePhrases, preferredTerminology, toneProfile, sentencePattern, rhetoricalPatterns, teachingStyle, avoidWords, vocabularyLevel, pacingFingerprint, narrativeDevice, emotionalArc, vernacularMarkers, avoidStructures, openingPattern, closingPattern.`,
    });

    if (!result.text.trim()) {
      throw new Error(
        `Voice DNA model returned no output (finish: ${result.finishReason}, completion tokens: ${result.usage.completionTokens})`
      );
    }

    const parsed = VoiceDNASchema.safeParse(parseJsonObject(result.text));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path.length ? issue.path.join(".") : "root";
      return NextResponse.json(
        { error: `Voice DNA response failed schema validation at ${path}: ${issue?.message ?? "invalid value"}` },
        { status: 502 }
      );
    }

    return NextResponse.json(ensureToneProfile(parsed.data), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice DNA extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
