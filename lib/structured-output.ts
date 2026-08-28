import { jsonrepair } from "jsonrepair";

export class UnusableStructuredOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnusableStructuredOutputError";
  }
}

export async function repairGeneratedJson({ text }: { text: string }): Promise<string | null> {
  try {
    const unfenced = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    return jsonrepair(unfenced);
  } catch (error) {
    console.warn("[structured-output] Local JSON repair failed:", error);
    return null;
  }
}

export function isUnusableStructuredOutputError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  return /NoObjectGenerated|JSONParse|TypeValidation|UnusableStructuredOutput/i.test(name)
    || /no object generated|could not parse|invalid json|schema validation|did not match the schema/i.test(message);
}

export async function retryUnusableStructuredOutput<T>(
  operation: () => Promise<T>,
  stage: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isUnusableStructuredOutputError(error)) throw error;
    console.warn(`[${stage}] Reattempting unusable structured response`);
    return operation();
  }
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, concurrency), values.length) }, () => worker())
  );
  return results;
}