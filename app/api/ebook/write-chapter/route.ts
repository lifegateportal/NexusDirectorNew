import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { deepSeekModel } from "@/lib/ai-providers";
import { WriteChapterRequestSchema, WriteChapterOutputSchema } from "@/lib/schemas/ebook";
import { SOURCE_LOCK_RULES, PROSE_MASTERY_RULES, READER_NORMALIZATION_RULES, PREMIUM_BOOK_STYLE_RULES, stripAudienceLanguage, cleanTranscriptForBook } from "@/lib/editorial-style-bible";
import { hydrateScriptureQuotes } from "@/lib/scripture-service";

export const runtime = "nodejs";
export const maxDuration = 300;

function trimToWordLimit(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")} […]`;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as unknown;
  let input;
  try {
    input = WriteChapterRequestSchema.parse(body);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid input" }, { status: 400 });
  }

  const {
    chapterNumber, chapterTitle, chapterPremise, nextChapterTitle, coreThesis,
    primaryTranslation, voiceDNA, authorConfig, sections: unverifiedSections,
    alreadyCoveredPoints, priorSectionsSample, bannedRecaps,
    alreadyQuotedRefs, forbiddenVerseTexts, overusedPhrases,
  } = input;

  let sections;
  try {
    const unplannedSections = unverifiedSections.filter((section) => !section.assignedPlan?.length);
    if (unplannedSections.length > 0) {
      return NextResponse.json({
        error: "Source-backed paragraph plans required",
        details: `Chapter ${chapterNumber} cannot be drafted without plans for section(s): ${unplannedSections.map((section) => section.sectionNumber).join(", ")}`,
      }, { status: 409 });
    }
    sections = await Promise.all(unverifiedSections.map(async (section) => ({
      ...section,
      quotes: await hydrateScriptureQuotes({
        quotes: section.quotes,
        sourceTexts: section.transcriptExcerpts,
        defaultTranslation: primaryTranslation,
      }),
    })));
  } catch (error) {
    return NextResponse.json({
      error: "Scripture verification failed",
      details: error instanceof Error ? error.message : "Live Scripture provider unavailable",
    }, { status: 502 });
  }

  // ── Voice DNA block ────────────────────────────────────────────────────────
  const voiceDnaBlock = voiceDNA
    ? `\n\n════════════════════════════════════════════
VOICE DNA — MUST BE ENFORCED
════════════════════════════════════════════
Tone: ${voiceDNA.toneProfile}
Sentence pattern: ${voiceDNA.sentencePattern}
Signature phrases (use verbatim where natural): ${(voiceDNA.signaturePhrases ?? []).slice(0, 5).join(" | ")}
Preferred terminology: ${(voiceDNA.preferredTerminology ?? []).slice(0, 8).join(", ")}
Avoid words: ${(voiceDNA.avoidWords ?? []).slice(0, 20).join(", ")}${voiceDNA.openingPattern ? `\nOpening pattern: ${voiceDNA.openingPattern}` : ""}${voiceDNA.closingPattern ? `\nClosing pattern: ${voiceDNA.closingPattern}` : ""}`
    : "";

  const authorConfigBlock = (authorConfig?.instructions || authorConfig?.targetAudience)
    ? `\n\n════════════════════════════════════════════
AUTHOR CONFIGURATION (highest priority)
════════════════════════════════════════════${authorConfig.targetAudience ? `\nTARGET AUDIENCE: ${authorConfig.targetAudience}` : ""}${authorConfig.instructions ? `\nAUTHOR INSTRUCTIONS: ${authorConfig.instructions}` : ""}`
    : "";

  // ── Cross-chapter dedup context ────────────────────────────────────────────
  // FIX 1: Use prose samples (not metadata) for n-gram overlap detection
  const priorContextBlock = priorSectionsSample.length > 0
    ? `\n\n════════════════════════════════════════════
PRIOR CHAPTERS — PROSE SAMPLE (avoid repeating these stories/examples)
════════════════════════════════════════════
These are actual sentences from prior chapters. Do NOT repeat these stories, examples, or scripture explanations. One-sentence reference maximum:
${priorSectionsSample.slice(0, 20).map((p) => `• ${p.slice(0, 200)}`).join("\n")}`
    : "";

  const bannedRecapsBlock = bannedRecaps.length > 0
    ? `\n\n════════════════════════════════════════════
BANNED RECAP SENTENCES
════════════════════════════════════════════
These thesis sentences from prior sections must NOT be paraphrased or echoed:
${bannedRecaps.slice(0, 10).map((r) => `• "${r}"`).join("\n")}`
    : "";

  const quoteDedupBlock = (alreadyQuotedRefs.length + forbiddenVerseTexts.length) > 0
    ? `\n\n════════════════════════════════════════════
SCRIPTURE DEDUP
════════════════════════════════════════════${alreadyQuotedRefs.length > 0 ? `\nAlready quoted in full — reference only, do NOT reprint: ${alreadyQuotedRefs.join(", ")}` : ""}${forbiddenVerseTexts.length > 0 ? `\nForbidden verse texts (exact text already printed — hard ban): ${forbiddenVerseTexts.slice(0, 5).map((t) => `"${t.slice(0, 60)}…"`).join(" | ")}` : ""}`
    : "";

  // G4: Lexical fingerprint — top overused phrases across the written corpus
  const lexicalBlock = overusedPhrases.length > 0
    ? `\n\n════════════════════════════════════════════
LEXICAL FINGERPRINT — FIND FRESHER LANGUAGE
════════════════════════════════════════════
These 3-gram constructions are already overused across prior chapters. Avoid them — find different phrasing for the same ideas:\n${overusedPhrases.slice(0, 15).map((p) => `• "${p}"`).join("\n")}`
    : "";

  const translationBlock = primaryTranslation
    ? `\n\nPRIMARY TRANSLATION: Default to ${primaryTranslation} for any verse where the speaker did not specify a translation.`
    : "";

  // ── Build section payload ──────────────────────────────────────────────────
  const sectionPayload = sections.map((sec, idx) => {
    // Keep chapter-writer input bounded so structured JSON generation remains stable
    // on long chapters with dense transcript excerpts.
    const excerptWordCap = 260;
    const sectionWordCap = 1600;
    let sectionWordTally = 0;
    const boundedExcerpts: string[] = [];
    for (const rawExcerpt of (sec.transcriptExcerpts ?? [])) {
      const cleaned = cleanTranscriptForBook(rawExcerpt).trim();
      if (!cleaned) continue;
      const bounded = trimToWordLimit(cleaned, excerptWordCap);
      const wc = bounded.split(/\s+/).filter(Boolean).length;
      if (sectionWordTally >= sectionWordCap) break;
      if (sectionWordTally + wc > sectionWordCap) {
        const remaining = Math.max(80, sectionWordCap - sectionWordTally);
        const tail = trimToWordLimit(bounded, remaining);
        boundedExcerpts.push(tail);
        sectionWordTally = sectionWordCap;
        break;
      }
      boundedExcerpts.push(bounded);
      sectionWordTally += wc;
    }

    const excerpts = boundedExcerpts
      .map((e, i) => `[${i + 1}] ${e}`)
      .join("\n\n");
    const planBlock = (sec.assignedPlan ?? []).length > 0
      ? `\nPARAGRAPH PLAN (follow this sequence):\n${sec.assignedPlan!.map((p, i) =>
          `  Step ${i + 1}: ${p.purpose}${(p.supportedExcerptNumbers ?? []).length > 0 ? ` [excerpts: ${p.supportedExcerptNumbers.join(", ")}]` : ""}`
        ).join("\n")}`
      : "";
    const keyPointsText = (sec.keyPoints ?? []).length > 0
      ? `\nKEY POINTS:\n${sec.keyPoints.map((k) => `• ${k}`).join("\n")}`
      : "";
    // G5: Include assigned quotes so the LLM knows which scriptures belong in this section
    const quotesText = (sec.quotes ?? []).length > 0
      ? `\nASSIGNED QUOTES FOR THIS SECTION:\n${sec.quotes.map((q) =>
          `  • ${q.reference}${q.translation ? ` (${q.translation})` : ""}: "${q.text}"`
        ).join("\n")}`
      : "";
    const lastFlag = sec.isLastSectionInChapter ? " [LAST SECTION — hard chapter boundary: do NOT develop the next chapter's themes]" : "";
    return `══ SECTION ${idx + 1} of ${sections.length}: §${sec.sectionNumber} — "${sec.heading}" (~${sec.targetWordCount ?? 500} words)${lastFlag} ══${keyPointsText}${quotesText}${planBlock}\n\nTRANSCRIPT EXCERPTS:\n${excerpts}`;
  }).join("\n\n────────────────────────────────────────────\n\n");

  // ── System prompt ──────────────────────────────────────────────────────────
  const system = `You are an elite ghostwriter writing every section of a single book chapter in one pass.

# THE CORE ADVANTAGE — USE IT
You are writing ALL ${sections.length} sections of Chapter ${chapterNumber} in a single context window. This means you SEE what you wrote for Section 1 when you write Section 2. Use this aggressively:
• If a concept is fully developed in Section 1, Section 2 gets one-sentence callback at most — zero re-explanation
• Each section OWNS its assigned content. Never develop the same argument, example, story, or illustration twice
• Intra-chapter duplication is a critical error — it signals you are not reading your own prior output

# SYNTHESIS, NOT TRANSCRIPTION
Extract core insights from the transcript. Reassemble as premium book prose — NOT paraphrased sentences. Every claim must trace to the provided excerpts. Zero fabrication.

# TRANSCRIPT EXHAUSTION — MANDATORY COVERAGE
• Every numbered excerpt [1], [2], [3]... must be accounted for in your output
• If an excerpt contains multiple teaching points, stories, or applications — ALL must be extracted and developed
• Mental coverage checklist: scan each excerpt before finishing — did I use every usable insight?
• No "sampling" from excerpts — if the speaker made 4 points in an excerpt, write all 4
• Each KEY POINT must appear as a fully developed argument (2-3 paragraphs minimum), not a single-sentence mention
• Stories require: setting, tension, resolution — not just "the speaker mentioned X"
• Scripture exposition requires ALL of: quote → what it says → what it means → how speaker applies it
• If you cannot cite the supporting excerpt number [N] for a sentence, that sentence is fabricated — delete it

# ANTI-PADDING DISCIPLINE — WRITE LESS, NOT MORE
• When transcript material thins out, STOP writing rather than invent connective tissue
• Three brilliant paragraphs beat five mediocre ones where two were padded with invented content
• BANNED PADDING: plausible extensions, theological fill, inferred background, "what the author probably meant"
• If you're explaining context the speaker didn't provide, you're fabricating — stop
• Target word counts are MAXIMUMS based on available content, not quotas to fill with invented prose
• Thin section material = shorter brilliant output. Never apologize for brevity when faithful to source.

# CONTENT COVERAGE — CRITICAL
• EXHAUST every distinct key point, story, illustration, and argument from each section's excerpts
• Meet or exceed the target word count for each section (±15% acceptable)
• Each section must develop ALL its assigned key points fully — not just mention them
• Write shorter ONLY to avoid bleeding into the next section/chapter — never to save tokens
• If you finish a section well under target word count, you missed content from the excerpts

# BESTSELLER PROSE STANDARDS — CRAFT-LEVEL EXECUTION
OPENING HOOKS:
• First sentence of each section must create forward momentum — never throat-clear
• Open with tension, question, vivid image, or provocative claim (drawn from transcript)
• BANNED OPENINGS: "Let's explore", "It's important to", "We need to understand", "In this section"

NARRATIVE RHYTHM:
• Vary sentence length deliberately: short punchy beat after long development
• Three short sentences in a row = monotony. Break the pattern.
• Long complex sentence followed by fragment or 3-5 word punch = mastery

READER PAYOFF:
• Every paragraph must deliver insight, revelation, or story advancement — not setup
• If a paragraph only prepares the reader for the next one, merge them
• No "bridge paragraphs" that exist only to connect two ideas

VISCERAL LANGUAGE:
• Replace abstract terms with concrete images when transcript provides them
• "spiritual growth" < "roots deepening in rocky soil" (if speaker used that image)
• "divine provision" < "manna appearing at dawn" (if that's the speaker's example)
• Use the speaker's actual metaphors and images — they chose them for a reason

ZERO FILLER:
• Delete throat-clearing: "Now", "So", "Well", "You see", "Here's the thing"
• Delete meta-commentary: "This is crucial", "Pay attention to this", "Notice that"
• Delete false transitions: "Moving on", "Another point", "Additionally"

# VOICE AND STYLE
• Active voice, strong verbs, authoritative tone
• NO em dashes (—). Use comma, colon, semicolon, or subordinate clause instead
• Contractions are natural (it's, you're, don't, isn't)
• Write for effortless comprehension when read aloud; let rhythm follow the teaching
• No consecutive paragraphs opening with the same word
• BANNED AI clichés: "In conclusion", "delve into", "tapestry", "navigate", "It's important to note", "Furthermore", "Moreover", "transformative", "vibrant", "fostering", "unpack", "ultimately", "at its core", "in essence", "profoundly", "certainly", "indeed", "simply put"

# PARAGRAPH FORMAT
Each paragraph is a string in a JSON array. Give each paragraph one teaching advance and only as many sentences as it needs. New point, new scripture quotation, or new example = new array element. NEVER add markdown headings inside paragraph arrays.

# SECTION BOUNDARIES
Each section is sealed. Do NOT preview the next section's content from within the current one. Presuppose what you just wrote — opening sentences of Section 2+ must not re-introduce concepts already developed.

# SCRIPTURE RULES
• Reproduce only the complete verified Scripture text supplied in ASSIGNED QUOTES. Never reconstruct, complete, correct, or paraphrase verse text from memory
• REMOVE SECTION HEADINGS: Strip any editorial headings or titles that appear in the verified text (e.g., "The Lord Is My Shepherd", "Jesus Heals the Blind Man"). Print only the verse text itself.
• Short (<40 words): *"verse text"* (Book Chapter:Verse, Translation) inline
• Long (40+ words): markdown blockquote with no quotation marks; place *Book Chapter:Verse, Translation* on its own final blockquote line with no dash
• Use a comma before the translation abbreviation in every citation: (Psalm 27:1, NIV), not (Psalm 27:1 NIV)
• Use an en dash in verse ranges: Titus 2:11–14
• Develop only the truth or application the speaker explicitly draws from the text; never force an application circuit
• No post-quote restatement (next sentence must ADVANCE the argument, not re-explain the quote)
• Anchor controlling verse BEFORE exposition, not after
• Preserve Greek/Hebrew terms exactly as the speaker stated them
• If verified text is unavailable, cite the reference only; never supply verse wording from memory

# REMOVE FROM OUTPUT — HARD RULE: if any of these appear in output, the book fails QC
• Live-event audience address: "say amen", "somebody say", "turn to your neighbor", "give your neighbor a high five", "can I get an amen", "clap your hands", "stand to your feet", "you may be seated"
• Room/attendance language: "in this room today", "everyone here", "church family", "good morning everyone", "how is everybody", "I'm glad you're here", "welcome to"
• Speaker self-reference banter: "I said that to say this", "let me tell you", "I want to be honest with you", "real quick", "hold on", "wait wait wait"
• Repeated filler and false starts: stutters, "uh", "um", "you know", "I mean", "right right", "okay okay", repeated words ("and and", "the the")
• Church logistics: announcements, event notices, offering/tithing appeals, altar calls, salvation appeals, prayer-line instructions
• Housekeeping cues: phone reminders, stand/sit cues, bathroom breaks, technical pauses
• Transitional banter that has no teaching content: "moving on", "next point", "back to our text", "as I was saying"
• Incomplete or broken sentences that trail off without a point
• Any sentence beginning with a markdown heading symbol (#, ##, ###)
${SOURCE_LOCK_RULES}${voiceDnaBlock}${authorConfigBlock}${priorContextBlock}${bannedRecapsBlock}${quoteDedupBlock}${lexicalBlock}${translationBlock}
${READER_NORMALIZATION_RULES}
${PROSE_MASTERY_RULES}
${PREMIUM_BOOK_STYLE_RULES}`;

  const coreThesisLine = coreThesis ? `\nCORE BOOK THESIS (thread through every section): ${coreThesis}` : "";
  const premiseLine = chapterPremise ? `\nCHAPTER PREMISE: ${chapterPremise}` : "";
  const nextChapterLine = nextChapterTitle
    ? `\nNEXT CHAPTER: "${nextChapterTitle}" — the final section's closing must NOT begin developing its themes`
    : "";

  const prompt = `Write all ${sections.length} sections of Chapter ${chapterNumber}: "${chapterTitle}"${coreThesisLine}${premiseLine}${nextChapterLine}

Return a JSON object with a "sections" array. Each element:
  sectionNumber: integer matching the §N above
  paragraphs: string[] — each string is one prose paragraph
  claimLedger: { claim: string }[] — one entry per key teaching claim made in this section

EXCERPT ACCOUNTABILITY — SELF-CHECK BEFORE RETURNING:
Before finalizing each section, verify:
✓ Every numbered excerpt [1], [2], [3]... has contributed content to the output
✓ Every key point listed has 2-3 paragraphs of development (not just a mention)
✓ Every assigned quote appears in the prose with proper formatting
✓ No paragraph exists that cannot cite its supporting excerpt number
✓ Word count within ±15% of target (unless transcript material genuinely insufficient)

────────────────────────────────────────────

${sectionPayload}`;

  // G6: SSE stream with heartbeat — prevents proxy read-timeout on long chapters
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(": ping\n\n")); } catch { /* closed */ }
      }, 15_000);
      try {
        const { object } = await generateObject({
          model: deepSeekModel,
          schema: WriteChapterOutputSchema,
          mode: "json",
          maxTokens: 24_000, // Sufficient for 3-5 sections at 800-1200 words each
          // Single-pass chapter writing benefits from tighter variance so all
          // sections stay refined, coherent, and stylistically consistent.
          temperature: 0.5,
          system,
          prompt,
        });

        // Clean each section's paragraphs — two passes:
        // 1. stripAudienceLanguage (deterministic regex)
        // 2. Drop heading-prefixed lines and empty results
        const cleaned = {
          sections: (object.sections ?? []).map((sec) => ({
            ...sec,
            paragraphs: (sec.paragraphs ?? [])
              .map((p) => stripAudienceLanguage(p.trim()))
              .filter(Boolean)
              .filter((p) => !(/^#{1,6}\s/.test(p))),
          })),
        };

        clearInterval(ping);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(cleaned)}\n\n`));
      } catch (err) {
        clearInterval(ping);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Chapter write failed" })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
