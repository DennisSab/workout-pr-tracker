import { NextResponse } from "next/server";

export type ReadJsonBodyResult<T = unknown> =
  | { ok: true; body: T }
  | { ok: false; response: NextResponse };

// Parses a JSON request body once. Malformed or empty bodies get a 400
// instead of throwing and bubbling up as a 500.
export async function readJsonBody<T = unknown>(
  req: Request
): Promise<ReadJsonBodyResult<T>> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }
}
