import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { deepSeekModel } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const maxDuration = 120;

const ClaimSchema = z.object({
  claim: z.string().trim().min(4).max(800),
  chapterNumber: z.number().int().positive().optional(),
  sectionNumber: z.number().int().positive().optional(),
});

const RequestSchema = z.object({
  incoming: z.array(ClaimSchema).min(1).max(40),
  existing: z.array(ClaimSchema.extend({
    chapterNumber: z.number().int().positive(),
    sectionNumber: z.number().int().positive(),
  })).max(400),
});

const ResultSchema = z.object({
  conflicts: z.array(z.object({
    incomingIndex: z.number().int().nonnegative(),
    existingIndex: z.number().int().nonnegative(),
    reason: z.string().default(""),
    confidence: z.number().min(0).max(1),
  })).default([]),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  if (parsed.data.existing.length === 0) {
    return NextResponse.json({ conflicts: [] });
  }

  try {
    const { object } = await generateObject({
      model: deepSeekModel,
      schema: ResultSchema,
      mode: "json",
      temperature: 0,
      system: `You enforce canonical idea ownership in a source-locked teaching book.

Identify an incoming claim as a duplicate only when it re-introduces, re-defines, re-explains, re-applies, or re-concludes substantially the same proposition as an existing claim.

Do NOT flag:
- two claims that merely share a broad theological topic;
- the same Scripture reference used for a genuinely different source-supported advance;
- a brief callback that presupposes the earlier claim without explaining it again;
- distinct steps in one argument;
- complementary claims that answer different questions.

Flag semantic duplication even when wording, syntax, examples, or synonyms differ. Return only conflicts with confidence of at least 0.88. Indexes are zero-based and must reference the supplied arrays.`,
      prompt: `INCOMING CLAIMS:
${parsed.data.incoming.map((claim, index) => `[I${index}] ${claim.claim}`).join("\n")}

EXISTING OWNED CLAIMS:
${parsed.data.existing.map((claim, index) => `[E${index}] Ch ${claim.chapterNumber} §${claim.sectionNumber}: ${claim.claim}`).join("\n")}`,
    });

    const conflicts = object.conflicts.filter((conflict) =>
      conflict.confidence >= 0.88 &&
      conflict.incomingIndex < parsed.data.incoming.length &&
      conflict.existingIndex < parsed.data.existing.length
    );
    return NextResponse.json({ conflicts });
  } catch (error) {
    return NextResponse.json({
      error: "Semantic claim validation failed",
      details: error instanceof Error ? error.message : "Unknown validation failure",
    }, { status: 502 });
  }
}