import { NextRequest, NextResponse } from "next/server";
import { fetchVerifiedScripture, ScriptureRequestSchema } from "@/lib/scripture-service";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  let input;
  try {
    input = ScriptureRequestSchema.parse(await req.json() as unknown);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await fetchVerifiedScripture(input));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fetch failed" }, { status: 502 });
  }
}
