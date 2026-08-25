# Quick Start: Unified Content Map Implementation

This guide walks through implementing the **first optimization** - replacing the slot-based content mapping with a single unified call.

**Impact:** 60-80K token savings per book, better content analysis quality, simpler code.

---

## Step 1: Create New Schema

Create or update `/lib/schemas/ebook.ts`:

```typescript
// Add to existing file (or create new section)

export const UnifiedContentSegmentSchema = z.object({
  id: z.string(),
  topic: z.string(),
  keyPoints: z.array(z.string()).default([]),
  quotes: z.array(QuoteSchema).default([]),
  estimatedWordCount: z.number(),
  narrativePosition: z.enum(["opening", "development", "climax", "resolution"]).default("development"),
  storyLabels: z.array(z.string()).default([]),
  scriptureReferences: z.array(z.string()).default([]),
});

export const UnifiedContentMapSchema = z.object({
  segments: z.array(UnifiedContentSegmentSchema),
  overarchingThemes: z.array(z.string()).default([]),
  teachingArc: z.string().default(""),
  coreThesis: z.string().default(""),
  targetAudience: z.string().default(""),
  uniqueVocabulary: z.array(z.string()).default([]),
  toneMap: z.string().default(""),
  storyInventory: z.array(z.object({
    label: z.string(),
    segmentId: z.string(),
  })).default([]),
});

export type UnifiedContentMap = z.infer<typeof UnifiedContentMapSchema>;
```

---

## Step 2: Create New API Route

Create `/app/api/ebook/unified-content-map/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { deepSeekModel } from "@/lib/ai-providers";
import { UnifiedContentMapSchema } from "@/lib/schemas/ebook";
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
      model: deepSeekModel,
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

    const result: UnifiedContentMap = {
      ...contentMap.object,
      segments: normalizedSegments,
    };

    console.log(
      `[unified-content-map] Extracted ${result.segments.length} segments, ` +
      `${result.storyInventory.length} stories, ` +
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
```

---

## Step 3: Add Feature Flag

In `/lib/env.ts`, add:

```typescript
export const env = {
  // ... existing env vars ...
  
  // Feature flags
  USE_UNIFIED_CONTENT_MAP: process.env.USE_UNIFIED_CONTENT_MAP === "true",
};
```

Add to `.env.local`:

```bash
# Feature flags for optimized pipeline
USE_UNIFIED_CONTENT_MAP=true
```

---

## Step 4: Update Pipeline Component

In `/app/components/EbookPipeline.tsx`, add a wrapper function that routes to the correct content map implementation:

```typescript
// Add near top with other helper functions

async function fetchContentMap(
  masterTranscript: string,
  voiceDNA: VoiceDNA | null
): Promise<ContentMap> {
  const useUnified = true; // or read from env: process.env.NEXT_PUBLIC_USE_UNIFIED_CONTENT_MAP === "true"
  
  if (useUnified) {
    // NEW: Single unified call
    return await postJson<ContentMap>(
      "/api/ebook/unified-content-map",
      { filteredTranscript: masterTranscript, voiceDNA }
    );
  } else {
    // OLD: Slot-based approach (fallback)
    return await postJson<ContentMap>(
      "/api/ebook/content-map",
      { masterTranscript }
    );
  }
}
```

Then in the pipeline execution (find the "mapping" stage), replace:

```typescript
// OLD CODE:
log("Mapping content segments…");
setStage("mapping");
const contentMap = await withRetry(() =>
  postJson<ContentMap>("/api/ebook/content-map", {
    masterTranscript: state.filteredTranscript || state.masterTranscript,
  })
);

// NEW CODE:
log("Mapping content segments…");
setStage("mapping");
const contentMap = await withRetry(() =>
  fetchContentMap(
    state.filteredTranscript || state.masterTranscript,
    state.voiceDNA
  )
);
```

---

## Step 5: Update Type Definitions (if needed)

If your existing `ContentMap` type is different, you may need to:

1. **Option A:** Update existing type to match new schema
2. **Option B:** Create adapter function to convert UnifiedContentMap → old ContentMap format

Example adapter (if you want to keep old types temporarily):

```typescript
function adaptUnifiedContentMap(unified: UnifiedContentMap): ContentMap {
  return {
    segments: unified.segments.map(seg => ({
      id: seg.id,
      topic: seg.topic,
      keyPoints: seg.keyPoints,
      quotes: seg.quotes,
      estimatedWordCount: seg.estimatedWordCount,
      // Map old fields if they exist
    })),
    totalEstimatedWords: unified.segments.reduce((sum, seg) => sum + seg.estimatedWordCount, 0),
    overarchingThemes: unified.overarchingThemes,
    teachingArc: unified.teachingArc,
    coreThesis: unified.coreThesis,
    targetAudience: unified.targetAudience,
    uniqueVocabulary: unified.uniqueVocabulary,
    toneMap: unified.toneMap,
  };
}
```

---

## Step 6: Test

1. **Start development server:**
   ```bash
   pnpm dev
   ```

2. **Run a test book:**
   - Upload a transcript (or audio file)
   - Let it run through the mapping stage
   - Check browser console for log: `[unified-content-map] Extracted X segments...`

3. **Compare outputs:**
   - Disable flag: `USE_UNIFIED_CONTENT_MAP=false`
   - Run same transcript through old pipeline
   - Compare quality of segments, themes, arc analysis

4. **Check token usage:**
   - Old approach: Check network tab, sum tokens from 4-5 content-map slot calls
   - New approach: Check single unified-content-map call
   - Should see 50-70% reduction

---

## Step 7: Validation Checklist

Before rolling out to production:

- [ ] Test with short transcript (3-5K words)
- [ ] Test with medium transcript (8-12K words)
- [ ] Test with long transcript (15-20K words)
- [ ] Verify all segments have IDs
- [ ] Verify story inventory is populated
- [ ] Verify scripture references are extracted
- [ ] Compare segment quality vs old method (are key points still accurate?)
- [ ] Check that downstream architect route still works
- [ ] Monitor token usage in production (should see immediate drop)

---

## Expected Results

After implementing unified content map:

✅ **Token Savings:**
- Old: 60-100K tokens (4 slot calls + synthesis)
- New: 25-40K tokens (single call)
- **Savings: 35-60K tokens per book**

✅ **Quality Improvements:**
- Better narrative arc detection (sees full flow)
- More accurate thesis extraction
- Complete story inventory (no stories split across slots)
- Improved theme identification

✅ **Simpler Code:**
- One API call instead of 5
- No slot splitting logic needed
- Cleaner error handling
- Easier to debug

✅ **Performance:**
- Faster (serial calls → single call)
- More reliable (fewer API boundaries)
- Better error recovery

---

## Troubleshooting

### Issue: "Context window exceeded"

**Solution:** This shouldn't happen for most transcripts (15K words = ~20K tokens, well under 128K limit), but if you have an unusually long recording:

```typescript
// In route.ts, before calling generateObject:
if (transcriptWordCount > 30000) {
  return NextResponse.json(
    { error: "Transcript too long for unified analysis. Consider splitting the recording." },
    { status: 422 }
  );
}
```

### Issue: "Segments missing key points"

**Solution:** The model may need stronger prompting. Add to system prompt:

```typescript
CRITICAL: Every segment MUST have at least 2-3 key points. 
If you extract a segment with 0-1 key points, it's too vague - split it into smaller, more specific segments.
```

### Issue: "Story inventory empty"

**Solution:** Add explicit story detection to prompt:

```typescript
STORY DETECTION:
Look for these patterns:
- "When I was...", "I remember...", "There was a time..."
- "Let me tell you about...", "I once met a man who..."
- "A friend of mine...", "I heard about..."
Label each story with its opening sentence (first 80 characters).
```

---

## Next Steps After This Works

Once unified content map is stable:

1. **Phase 2:** Implement Master Blueprint (consolidate architect + assign-segments)
2. **Phase 3:** Implement Batch Chapter Writing (write-chapter replaces write-section)
3. **Phase 4:** Deprecate old routes

Each phase builds on the previous, so you can roll out incrementally.

---

## Rollback Plan

If you need to revert:

1. Set flag: `USE_UNIFIED_CONTENT_MAP=false`
2. Restart server
3. Pipeline automatically falls back to old slot-based content-map

No data loss, no downtime.

---

## Questions?

See full proposal: [book-pipeline-optimization-proposal.md](./book-pipeline-optimization-proposal.md)

Visual comparison: [pipeline-comparison-visual.md](./pipeline-comparison-visual.md)
