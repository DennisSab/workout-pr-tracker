// Run with: node --experimental-strip-types --test scripts/api-responses.test.mjs
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/lib/")) {
      return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    if (specifier === "next/server") {
      return nextResolve(
        new URL("../node_modules/next/server.js", import.meta.url).href,
        context
      );
    }
    return nextResolve(specifier, context);
  },
});

const { readJsonBody } = await import("../lib/api-responses.ts");

function jsonRequest(body) {
  return new Request("http://localhost/api/workouts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

test("readJsonBody returns the parsed body for valid JSON", async () => {
  const result = await readJsonBody(jsonRequest(JSON.stringify({ date: "2026-01-01" })));

  assert.equal(result.ok, true);
  assert.deepEqual(result.body, { date: "2026-01-01" });
});

test("readJsonBody returns 400 Invalid JSON body for malformed JSON", async () => {
  for (const body of ["", "{", "not json", '{"date":']) {
    const result = await readJsonBody(jsonRequest(body));

    assert.equal(result.ok, false);
    assert.equal(result.response.status, 400);
    assert.deepEqual(await result.response.json(), { error: "Invalid JSON body" });
  }
});
