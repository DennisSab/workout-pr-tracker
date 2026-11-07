import { NextResponse } from "next/server";

export type JsonBodyResult =
  | { success: true; data: unknown }
  | { success: false; response: NextResponse<{ error: string }> };

export async function readJsonBody(req: Request): Promise<JsonBodyResult> {
  try {
    const data = await req.json();
    return { success: true, data };
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}
