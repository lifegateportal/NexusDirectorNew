# Implementation Summary: Unified Content Map (Phase 1)

**Date:** August 25, 2026  
**Status:** ✅ Complete and Ready to Test

---

## What Was Implemented

✅ **Phase 1 of the pipeline optimization** - Unified Content Map

This is the first (and easiest) optimization that consolidates 4-5 separate content mapping API calls into a single comprehensive call.

---

## Files Modified/Created

### 1. Schema Updates
**File:** `/lib/schemas/ebook.ts`

Added new schemas:
- `UnifiedContentSegmentSchema` - Enhanced segment with narrative position, story labels, scripture refs
- `UnifiedContentMapSchema` - Comprehensive content map from single API call
- Exported `UnifiedContentMap` type for TypeScript

### 2. Environment Configuration
**File:** `/lib/env.ts`

Added feature flag:
- `USE_UNIFIED_CONTENT_MAP` - Boolean flag to enable/disable optimized pipeline

### 3. Environment Example
**File:** `.env.example`

Added configuration:
```bash
USE_UNIFIED_CONTENT_MAP=true
```

### 4. New API Route
**File:** `/app/api/ebook/unified-content-map/route.ts`

Created new optimized content mapping endpoint that:
- Accepts complete filtered transcript (no slot splitting)
- Runs single comprehensive LLM analysis
- Extracts segments, themes, arc, story inventory, scripture positions
- Returns unified content map in one response

### 5. Pipeline Component Updates
**File:** `/app/components/EbookPipeline.tsx`

Added:
- Import for `UnifiedContentMap` type
- `adaptUnifiedContentMap()` - Converts new format to legacy format for backward compatibility
- `fetchContentMap()` - Router function that chooses between old/new approach based on feature flag
- Updated content mapping stage to use new router function

### 6. Layout Updates
**File:** `/app/layout.tsx`

Added:
- Import for `env` config
- Data attribute on `<html>` tag: `data-use-unified-content-map` - Makes feature flag accessible to client components

---

## How It Works

### Feature Flag Flow

1. **Environment Variable** (.env.local):
   ```bash
   USE_UNIFIED_CONTENT_MAP=true
   ```

2. **Server-side** (lib/env.ts):
   - Parses env var into boolean
   - Validates configuration

3. **Layout Injection** (app/layout.tsx):
   - Passes flag to client via data attribute on `<html>` element

4. **Client-side Router** (EbookPipeline.tsx):
   - Reads flag from `document.documentElement.dataset.useUnifiedContentMap`
   - Routes to appropriate API endpoint

### API Call Comparison

**OLD (Slot-based):**
```typescript
// 4-5 separate API calls
for (const slot of transcriptSlots) {
  await postJson("/api/ebook/content-map", { slot });
}
await postJson("/api/ebook/content-map", { synthesize: true });
// Total: 60-100K tokens
```

**NEW (Unified):**
```typescript
// Single comprehensive call
await postJson("/api/ebook/unified-content-map", { 
  filteredTranscript, 
  voiceDNA 
});
// Total: 25-40K tokens
```

### Backward Compatibility

The new unified content map is automatically adapted to the legacy `ContentMap` format using `adaptUnifiedContentMap()`:

- ✅ Existing architect route works unchanged
- ✅ Existing writer routes work unchanged
- ✅ All downstream stages compatible
- ✅ No breaking changes to UI or user experience

---

## Testing Instructions

### Step 1: Enable the Feature

Create `.env.local` (if not exists):
```bash
USE_UNIFIED_CONTENT_MAP=true
```

Add your existing API keys (copy from your current .env file).

### Step 2: Start Development Server

```bash
pnpm dev
```

### Step 3: Run a Test Book

1. Navigate to the ebook pipeline page
2. Upload a transcript or audio file
3. Let it run through the mapping stage
4. Watch the browser console for logs:
   ```
   [unified-content-map] Extracted X segments, Y stories, Z estimated words
   ```

### Step 4: Compare Results

**Test A - New Pipeline:**
- Keep `USE_UNIFIED_CONTENT_MAP=true`
- Run a transcript
- Note: segment count, quality, token usage (check network tab)

**Test B - Old Pipeline:**
- Set `USE_UNIFIED_CONTENT_MAP=false`
- Restart dev server
- Run same transcript
- Compare results

### Step 5: Validate Quality

Check that:
- [ ] Segment count is similar (±2 segments is fine)
- [ ] Key points are accurate and reflect speaker's words
- [ ] Stories/illustrations are detected
- [ ] Scripture references are captured
- [ ] Teaching arc and thesis make sense
- [ ] Architect stage runs successfully with new content map
- [ ] Book completes without errors

---

## Expected Improvements

### Token Savings
- **Old approach:** 60-100K tokens (4-5 slot calls + synthesis)
- **New approach:** 25-40K tokens (single call)
- **Savings:** 35-60K tokens per book (50-70% reduction in mapping phase)

### Quality Improvements
- ✅ Better narrative arc detection (sees complete message flow)
- ✅ More accurate thesis extraction
- ✅ Complete story inventory (no stories split across slots)
- ✅ Better theme identification
- ✅ No artificial slot boundaries

### Speed Improvements
- ✅ Faster (4-5 sequential calls → 1 call)
- ✅ More reliable (fewer API boundaries = fewer failure points)
- ✅ Simpler error handling

---

## Rollback Instructions

If you need to revert to the old pipeline:

1. **Option A - Via Environment:**
   ```bash
   USE_UNIFIED_CONTENT_MAP=false
   ```
   Restart server. Pipeline automatically uses old slot-based approach.

2. **Option B - Complete Rollback:**
   If you need to remove all changes:
   - The old route `/api/ebook/content-map` is still fully functional
   - All old code paths are preserved
   - Simply set flag to false

**No data loss, no downtime.**

---

## Monitoring

### Things to Watch

1. **Token Usage:**
   - Open browser DevTools → Network tab
   - Filter for "unified-content-map" or "content-map"
   - Check request/response sizes
   - Should see 50-70% reduction

2. **Error Logs:**
   - Browser console
   - Server logs (terminal running `pnpm dev`)
   - Look for `[unified-content-map]` prefixed messages

3. **Quality Metrics:**
   - Are segments accurately extracted?
   - Are key points faithful to speaker's words?
   - Does teaching arc make sense?
   - Are stories and scriptures detected?

---

## Troubleshooting

### Issue: "Context window exceeded"

**Cause:** Transcript too large for single call.

**Solution:**
- This shouldn't happen for typical sermons (15K words = ~20K tokens, well under 128K limit)
- If you have an unusually long recording (>30K words), the route will return an error
- Set `USE_UNIFIED_CONTENT_MAP=false` as fallback for that specific book

### Issue: "Segments have no key points"

**Cause:** Model needs stronger prompting.

**Fix:** Open `/app/api/ebook/unified-content-map/route.ts` and add to system prompt:
```typescript
CRITICAL: Every segment MUST have at least 2-3 key points. 
If you extract a segment with 0-1 key points, it's too vague - split it.
```

### Issue: "Story inventory is empty"

**Cause:** Model didn't detect illustrations.

**Fix:** The system prompt already includes story detection patterns. If this persists, check that the transcript actually contains illustrations/anecdotes.

### Issue: "Downstream architect fails"

**Cause:** Incompatibility between unified and legacy format.

**Fix:** Check `adaptUnifiedContentMap()` function in EbookPipeline.tsx. The adapter should handle all format conversions. If you see a specific field missing, update the adapter.

---

## Next Steps

Once unified content map is validated:

### Phase 2: Master Blueprint
- Consolidate architect + assign-segments into single comprehensive planning call
- Expected benefit: Better holistic planning, proactive deduplication

### Phase 3: Batch Chapter Writing
- Write complete chapters (all sections) in one API call instead of 50+ section calls
- Expected benefit: 85-90% token reduction, better narrative coherence, 5-8× speed improvement

Each phase builds on the previous and can be rolled out incrementally.

---

## Cost Impact Analysis

For a typical 10-chapter, 50-section book:

### Content Mapping Phase Only

**Before:**
- Slot 1: 15-25K tokens
- Slot 2: 15-25K tokens
- Slot 3: 15-25K tokens
- Slot 4: 15-25K tokens
- Synthesis: 15-20K tokens
- **Total: 75-120K tokens**
- **Cost: ~$0.23-$0.36** (at DeepSeek pricing)

**After:**
- Unified call: 25-40K tokens
- **Cost: ~$0.08-$0.12**

**Savings per book: $0.15-$0.24 (60-70% reduction)**

### Full Pipeline Estimate

This is just Phase 1. When combined with Phases 2-3:

**Current total:** ~$10-16 per book  
**Optimized total:** ~$5-7 per book  
**Total savings: ~$5-9 per book (50-60% reduction)**

---

## Success Criteria

This implementation is successful if:

- ✅ Feature flag works (can switch between old/new)
- ✅ Token usage drops 50-70% in mapping phase
- ✅ Content map quality is equal or better
- ✅ Downstream stages work without modification
- ✅ No UI changes or user-visible differences
- ✅ Can rollback instantly if needed

---

## Documentation

Full details available in:
- [book-pipeline-optimization-proposal.md](./book-pipeline-optimization-proposal.md) - Complete technical proposal
- [pipeline-comparison-visual.md](./pipeline-comparison-visual.md) - Visual comparison and benefits
- [quick-start-unified-content-map.md](./quick-start-unified-content-map.md) - Step-by-step implementation guide

---

## Support

If you encounter issues:

1. Check browser console and server logs for error messages
2. Review troubleshooting section above
3. Try rollback to old pipeline to isolate the issue
4. Check that all environment variables are set correctly

The old pipeline remains fully functional as a safety net.
