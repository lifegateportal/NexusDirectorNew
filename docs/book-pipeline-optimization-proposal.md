# Book Pipeline Optimization Proposal
**Date:** August 25, 2026  
**Objective:** Reduce API calls by 85%, improve coherence, and unlock model intelligence

---

## Executive Summary

The current pipeline architecture treats book writing as **50+ independent micro-tasks**, sending the same context (Voice DNA, Content Map, Architecture) with every section write call. This burns tokens wastefully and prevents the model from seeing the narrative flow.

**Current State:**
- 10 chapters × 5 sections = **50 separate write-section API calls**
- Each call resends: Voice DNA (2-3KB), Content Map (15-30KB), Architecture (5-10KB), dedup corpus (10-50KB)
- Total redundant context: **~1.5-3MB across all calls**
- Model writes blind to section-to-section transitions

**Proposed State:**
- **5-8 total API calls** for the entire book writing phase
- Each call writes a complete chapter (all sections) with full narrative context
- **Token reduction: 85-90%**
- **Better coherence:** Model naturally handles transitions and flow

---

## Current Pipeline Flow (What Needs Changing)

### ✅ Analysis Phase (Keep These - Already Efficient)
1. **Transcription** → Audio to text (Deepgram)
2. **Signal Filter** → Strip non-teaching content
3. **Voice DNA** → Extract author's style/tone

### 🔴 Mapping Phase (Inefficient - Multiple API Calls)
4. **Content Map** → Currently splits transcript into slots, makes **3-6 separate LLM calls**
   - **Problem:** Transcript is artificially chunked; model can't see full message flow
   - **Token waste:** ~15-25K tokens per slot × 4 slots = 60-100K tokens

### 🔴 Planning Phase (Generates Detailed Plan But Doesn't Use It)
5. **Architect** → Designs chapter structure
6. **Assign Segments** → Maps transcript segments to sections
   - **Problem:** Creates granular assignments but then writes sections in isolation
   - **Missed opportunity:** Plan is ready but execution is fragmented

### 🔴 Writing Phase (MAJOR BOTTLENECK - 50+ API Calls)
7. **Write Section** → Called **once per section** (50+ times for a book)
   - **Each call sends:**
     * Voice DNA: ~2-3KB
     * Content Map: ~20-30KB  
     * Architecture: ~8-12KB
     * Section assignment: ~2-5KB
     * Previous sections (dedup corpus): ~10-50KB (grows with each section)
     * Coverage ledger: ~5-10KB
     * Banned recaps: ~3-8KB
     * **Total context per call: 50-120KB**
   - **For 50 sections: 2.5-6MB of redundant context**
   - **Sequential processing:** Can't parallelize effectively due to dedup dependencies

### ✅ Refinement Phase (Keep These)
8. **Polish** → Add chapter intros/conclusions
9. **Front Matter** → Write introduction/conclusion
10. **Export** → Generate PDF/EPUB

---

## Proposed Optimized Pipeline

### Phase 1: Analysis (No Changes Needed)
```
Transcription → Signal Filter → Voice DNA
```
**Unchanged:** These are already efficient single-pass operations.

---

### Phase 2: Unified Content Analysis (Consolidate 3-6 calls → 1 call)

#### **NEW: Content Map v2 (Single Unified Call)**

**Current behavior:**
```javascript
// Split transcript into 4 slots
// Make 4 separate LLM calls (one per slot)
for (const slot of transcriptSlots) {
  const segments = await extractSegments(slot);
  allSegments.push(...segments);
}
// Then make a 5th call to synthesize
const synthesis = await synthesizeContentMap(allSegments);
```

**Proposed behavior:**
```javascript
// Single comprehensive call with full transcript
const contentMap = await generateObject({
  model: deepSeekModel,
  schema: UnifiedContentMapSchema,
  system: CONTENT_ANALYST_SYSTEM,
  prompt: `
    FULL TRANSCRIPT (${transcriptWordCount} words):
    ${filteredTranscript}
    
    Extract:
    1. Teaching segments (topic, key points, quotes)
    2. Narrative arc and thesis
    3. Target audience signals
    4. Unique vocabulary/terminology
  `,
});
```

**Benefits:**
- **Token reduction:** 60-100K → 20-35K (4-5× savings)
- **Better quality:** Model sees full message flow, can identify true arc
- **Faster:** 4-5 sequential calls → 1 call
- **No artificial boundaries:** Segments aren't cut at arbitrary word limits

**Why this works:**
- DeepSeek has 128K context window
- Most sermons: 8-15K words = 11-20K tokens
- Leaves 100K+ tokens for analysis and output
- Current slot-based approach was designed for older 32K context models

---

### Phase 3: Master Blueprint (Consolidate 2 calls → 1 call)

#### **NEW: Architect v2 (Single Comprehensive Planning Call)**

**Current behavior:**
```javascript
// 1. Generate architecture (chapter/section structure)
const architecture = await generateArchitecture(contentMap);

// 2. Separate call to assign segments to sections
const assignments = await assignSegments(architecture, contentMap);
```

**Proposed behavior:**
```javascript
// Single unified planning call
const masterBlueprint = await generateObject({
  model: deepSeekReasonerModel, // Use R1 for complex planning
  schema: MasterBlueprintSchema,
  system: MASTER_ARCHITECT_SYSTEM,
  prompt: `
    CONTENT MAP: ${JSON.stringify(contentMap)}
    VOICE DNA: ${JSON.stringify(voiceDNA)}
    TARGET WORD COUNT: ${targetWordCount}
    
    Create a comprehensive book blueprint including:
    1. Chapter structure (titles, themes, word counts)
    2. Section assignments (which transcript segments → which sections)
    3. Narrative flow notes (chapter-to-chapter bridges)
    4. Deduplication strategy (which claims appear where)
    5. Scripture placement plan (which verses → which sections)
    6. Story/illustration inventory (don't repeat across chapters)
  `,
});
```

**Benefits:**
- **Smarter planning:** Model sees the complete picture before committing to structure
- **Proactive deduplication:** Duplication prevention built into the plan, not reactive
- **Better arc:** Model can design chapter progression holistically
- **Single source of truth:** One comprehensive blueprint guides all writing

---

### Phase 4: Batch Chapter Writing (50+ calls → 5-8 calls)

#### **NEW: Write Complete Chapter (Not Individual Sections)**

**Current behavior (PER SECTION - called 50 times):**
```javascript
// For EACH section individually:
const section = await writeSection({
  assignment: sectionAssignment,        // 2-5KB
  voiceDNA: voiceDNA,                  // 2-3KB
  contentMap: contentMap,              // 20-30KB
  architecture: architecture,          // 8-12KB
  previousSections: allPreviousSections, // 10-50KB (grows)
  coverageLedger: ledger,              // 5-10KB
  bannedRecaps: recaps,                // 3-8KB
  // TOTAL: 50-120KB context per section
});
```
**Total for 50 sections: 2.5-6MB of redundant context**

**Proposed behavior (PER CHAPTER - called 10 times):**
```javascript
// Write ENTIRE chapter in one API call
const chapter = await writeChapter({
  chapterNumber: 3,
  blueprint: masterBlueprint,          // Sent once per chapter
  transcriptExcerpts: relevantExcerpts, // Only segments for this chapter
  voiceDNA: voiceDNA,                  // Sent once per chapter
  previousChapters: completedChapters, // For dedup (grows slowly)
  // TOTAL: 60-100KB per chapter (not per section)
});

// Model outputs:
// {
//   title: "...",
//   sections: [
//     { heading: "...", body: "...", wordCount: 850 },
//     { heading: "...", body: "...", wordCount: 920 },
//     { heading: "...", body: "...", wordCount: 780 },
//     ...
//   ],
//   transitionNote: "Bridges to Chapter 4 via...",
// }
```

**Benefits:**
- **85-90% token reduction:** 2.5-6MB → 600KB-1MB total
- **Better section coherence:** Model writes section transitions naturally
- **Natural paragraph flow:** No artificial boundaries between sections
- **Smarter deduplication:** Model sees what it wrote 2 sections ago
- **Faster execution:** 10 parallel chapter calls vs 50 sequential section calls
- **Utilizes model intelligence:** Trust the LLM to handle micro-structure

**Why this works:**
- Modern LLMs excel at long-form coherent writing
- DeepSeek 128K context can hold: blueprint (20K) + chapter excerpts (15-25K) + previous chapters (30-50K) = 65-95K tokens
- **Current approach micromanages** the model (write 800 words, stop, wait for next instruction)
- **New approach trusts** the model to write a complete chapter following the blueprint

---

### Phase 5: Refinement (Keep These, Adapt Inputs)

#### Polish
- **Change:** Accept full chapters instead of individual sections
- **Benefit:** Can write chapter-level introductions/conclusions more naturally

#### Front Matter & Export
- **No change needed**

---

## Implementation Strategy

### New Schemas

```typescript
// NEW: Unified Content Map (replaces slot-based extraction)
const UnifiedContentMapSchema = z.object({
  segments: z.array(z.object({
    id: z.string(),
    topic: z.string(),
    keyPoints: z.array(z.string()),
    quotes: z.array(QuoteSchema),
    estimatedWordCount: z.number(),
    narrativePosition: z.enum(["opening", "development", "climax", "resolution"]),
  })),
  overarchingThemes: z.array(z.string()),
  teachingArc: z.string(),
  coreThesis: z.string(),
  targetAudience: z.string(),
  uniqueVocabulary: z.array(z.string()),
  storyInventory: z.array(z.object({
    label: z.string(),
    segmentId: z.string(),
  })),
});

// NEW: Master Blueprint (combines architecture + assignments + strategy)
const MasterBlueprintSchema = z.object({
  bookTitle: z.string(),
  subtitle: z.string(),
  chapters: z.array(z.object({
    number: z.number(),
    title: z.string(),
    keyTheme: z.string(),
    premiseLine: z.string(),
    targetWordCount: z.number(),
    sections: z.array(z.object({
      sectionNumber: z.number(),
      heading: z.string(),
      sourceSegmentIds: z.array(z.string()),
      targetWordCount: z.number(),
      keyPoints: z.array(z.string()), // From content map
      scriptureReferences: z.array(z.string()),
      storyLabels: z.array(z.string()),
      narrativeRole: z.enum(["hook", "context", "mechanism", "application"]),
    })),
    bridgeToNext: z.string().optional(),
  })),
  deduplicationNotes: z.array(z.string()),
  globalStoryRegistry: z.array(z.string()),
});

// NEW: Chapter Write Output (all sections in one response)
const ChapterDraftSchema = z.object({
  number: z.number(),
  title: z.string(),
  sections: z.array(z.object({
    sectionNumber: z.number(),
    heading: z.string(),
    body: z.string(), // Full prose
    wordCount: z.number(),
    scripturesUsed: z.array(z.string()),
    storiesUsed: z.array(z.string()),
  })),
  transitionNote: z.string().optional(),
  qualityMetrics: z.object({
    totalWords: z.number(),
    passiveVoiceInstances: z.number(),
    repeatSentences: z.array(z.string()),
  }),
});
```

### New Routes

```typescript
// app/api/ebook/unified-content-map/route.ts
export async function POST(req: NextRequest) {
  const { filteredTranscript, voiceDNA } = await req.json();
  
  const contentMap = await generateObject({
    model: deepSeekModel,
    schema: UnifiedContentMapSchema,
    system: UNIFIED_CONTENT_ANALYST_SYSTEM,
    prompt: buildContentMapPrompt(filteredTranscript),
  });
  
  return NextResponse.json(contentMap);
}

// app/api/ebook/master-blueprint/route.ts  
export async function POST(req: NextRequest) {
  const { contentMap, voiceDNA, targetWordCount, templateConfig } = await req.json();
  
  const blueprint = await generateObject({
    model: deepSeekReasonerModel, // Use R1 for complex planning
    schema: MasterBlueprintSchema,
    system: MASTER_ARCHITECT_SYSTEM,
    prompt: buildBlueprintPrompt(contentMap, voiceDNA, targetWordCount),
  });
  
  return NextResponse.json(blueprint);
}

// app/api/ebook/write-chapter/route.ts (REPLACES write-section)
export async function POST(req: NextRequest) {
  const {
    chapterNumber,
    blueprint,
    transcript,
    voiceDNA,
    previousChapters, // For deduplication
  } = await req.json();
  
  // Extract only the transcript segments needed for this chapter
  const chapterBlueprint = blueprint.chapters.find(c => c.number === chapterNumber);
  const relevantSegments = extractRelevantSegments(transcript, chapterBlueprint.sections);
  
  const chapterDraft = await generateObject({
    model: deepSeekModel,
    schema: ChapterDraftSchema,
    maxTokens: 12000, // Enough for 3000-3500 word chapter
    system: CHAPTER_WRITER_SYSTEM,
    prompt: buildChapterWriterPrompt({
      chapterBlueprint,
      relevantSegments,
      voiceDNA,
      previousChapters,
      deduplicationNotes: blueprint.deduplicationNotes,
      globalStoryRegistry: blueprint.globalStoryRegistry,
    }),
  });
  
  return NextResponse.json(chapterDraft);
}
```

### Migration Path (No Breaking Changes to UI)

1. **Phase 1 - New Routes (Parallel Implementation)**
   - Create new routes alongside existing ones
   - Add feature flag: `USE_OPTIMIZED_PIPELINE` in env
   - Test new pipeline on sample books

2. **Phase 2 - Frontend Switch**
   - Update `EbookPipeline.tsx` to call new routes when flag enabled
   - UI flow stays identical (user sees same stages)
   - Internal: "mapping" calls new unified-content-map, "writing" calls write-chapter

3. **Phase 3 - Validation**
   - Run A/B comparison: old vs new pipeline on same transcripts
   - Validate quality metrics (coherence, duplication, word count accuracy)
   - Monitor token usage (should see 85-90% reduction)

4. **Phase 4 - Deprecation**
   - After validation, make optimized pipeline default
   - Remove old routes after 1-2 releases

---

## Expected Improvements

### Token Usage (Cost Reduction)

**Current Pipeline (10 chapter, 50 section book):**
```
Signal Filter:     15-25K tokens
Voice DNA:         20-30K tokens
Content Map:       60-100K tokens (4-5 slot calls)
Architect:         25-35K tokens
Assign Segments:   15-20K tokens
Write Sections:    150-250K tokens (50 section calls × 3-5K each)
Polish:            30-50K tokens
Front Matter:      15-25K tokens
──────────────────────────────────────────
TOTAL:            330-535K tokens (~$10-$16 at DeepSeek pricing)
```

**Optimized Pipeline:**
```
Signal Filter:     15-25K tokens (same)
Voice DNA:         20-30K tokens (same)
Unified Content:   25-40K tokens (single call, no slots)
Master Blueprint:  35-50K tokens (R1 reasoning, but single call)
Write Chapters:    30-40K tokens (10 chapter calls × 3-4K each)
Polish:            20-30K tokens (fewer calls)
Front Matter:      15-25K tokens (same)
──────────────────────────────────────────
TOTAL:            160-240K tokens (~$5-$7 at DeepSeek pricing)
```

**Savings: 50-60% token reduction, 50-60% cost reduction**

### Quality Improvements

1. **Better Narrative Flow**
   - Model writes section transitions naturally
   - Paragraph-to-paragraph coherence improves
   - Chapter feels like a unified piece, not stitched sections

2. **Smarter Deduplication**
   - Model knows what it said 2-3 sections ago in same chapter
   - Proactive strategy in blueprint prevents repetition upfront
   - Fewer reactive fixes in polish phase

3. **More Intelligent Use of Source Material**
   - Model sees all chapter source material at once
   - Can choose best excerpts for each section naturally
   - Better scripture placement and story distribution

4. **Reduced Mechanical Errors**
   - Fewer API boundaries = fewer JSON parse failures
   - Less prompt injection risk (context sent fewer times)
   - More robust error recovery (retry 1 chapter vs 1 section)

### Performance Improvements

**Current Pipeline (Sequential Section Writing):**
```
Write 50 sections sequentially (can't parallelize due to dedup deps)
Average: 30-60 seconds per section
Total writing phase: 25-50 minutes
```

**Optimized Pipeline (Batch Chapter Writing):**
```
Write 10 chapters with concurrency limit of 3
Average: 90-120 seconds per chapter
Total writing phase with 3-parallel: 5-7 minutes
```

**Speedup: 5-8× faster writing phase**

---

## Risks & Mitigations

### Risk 1: Model Writes Shorter Sections Than Target
**Mitigation:**
- Blueprint includes explicit word count targets per section
- Post-generation validation: if section is <60% of target, retry with "expand this section" instruction
- Prompt emphasizes: "Each section must develop its ideas fully"

### Risk 2: Chapter Output Too Large for Single Response
**Mitigation:**
- Set maxTokens conservatively (12K = ~3500 words output)
- Most chapters: 5 sections × 700 words = 3500 words = fits comfortably
- For long chapters (>4000 words), split into 2 API calls (sections 1-3, then 4-6)

### Risk 3: Quality Regression on Complex Books
**Mitigation:**
- A/B test on diverse content (narrative sermons, doctrinal teaching, exegetical series)
- Keep old pipeline available as fallback for edge cases
- Monitor quality metrics dashboard

### Risk 4: Lost Granular Control
**Mitigation:**
- Blueprint still gives section-level instruction
- Can add per-section "special instructions" field to blueprint
- Polish phase can still refine individual sections if needed

---

## Next Steps

1. **Review & Approve:** Discuss this proposal with team/stakeholders
2. **Prototype:** Implement unified-content-map route first (easiest, immediate benefit)
3. **Test:** Run on 2-3 sample books, compare output quality
4. **Implement:** Build master-blueprint and write-chapter routes
5. **Validate:** A/B test against current pipeline
6. **Deploy:** Roll out behind feature flag
7. **Monitor:** Track token usage and quality metrics
8. **Iterate:** Refine prompts based on real-world results

---

## Conclusion

The current pipeline is **architecturally sophisticated** but **operationally inefficient**. It micromanages the LLM with 50+ isolated calls, wasting tokens on redundant context and preventing the model from seeing narrative flow.

The proposed optimization **trusts modern LLM capabilities** by:
- Sending full context once per chapter instead of once per section
- Letting the model handle micro-transitions naturally
- Building a comprehensive blueprint before writing (proactive vs reactive)
- Utilizing larger context windows effectively

**Expected outcomes:**
- ✅ **85-90% fewer API calls** (50+ → 5-8)
- ✅ **50-60% lower token costs**
- ✅ **5-8× faster writing phase**
- ✅ **Better coherence and narrative flow**
- ✅ **More intelligent model behavior**
- ✅ **No UI changes required**

This is a **low-risk, high-reward optimization** that can be implemented incrementally with full backward compatibility.
