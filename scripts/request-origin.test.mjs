import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const { isSameOriginRequest, rejectCrossOriginRequest } = await import(
  "../lib/request-origin.ts"
);

const APP = "https://workoutpr.example";
const API = `${APP}/api/workouts`;

function request(method, headers = {}, url = API) {
  return new Request(url, { method, headers });
}

test("same-origin writes from the app are allowed", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal(
      isSameOriginRequest(
        request(method, { origin: APP, "sec-fetch-site": "same-origin" })
      ),
      true,
      method
    );
  }
});

test("a matching Origin alone is allowed (browsers without Sec-Fetch-*)", () => {
  assert.equal(isSameOriginRequest(request("POST", { origin: APP })), true);
});

test("the expected origin comes from the request, so localhost works too", () => {
  const local = "http://localhost:3000";
  assert.equal(
    isSameOriginRequest(
      request("POST", { origin: local }, `${local}/api/workouts`)
    ),
    true
  );
});

test("cross-site writes are rejected with 403 (the CSRF attack)", async () => {
  const forged = request("POST", {
    origin: "https://evil.example",
    "sec-fetch-site": "cross-site",
  });
  assert.equal(isSameOriginRequest(forged), false);

  const response = rejectCrossOriginRequest(forged);
  assert.equal(response?.status, 403);
  assert.deepEqual(await response.json(), {
    error: "Cross-origin request rejected.",
  });
});

test("a foreign Origin is rejected even without Sec-Fetch-Site", () => {
  assert.equal(
    isSameOriginRequest(request("DELETE", { origin: "https://evil.example" })),
    false
  );
});

test("lookalike origins are rejected", () => {
  for (const origin of [
    "http://workoutpr.example", // wrong scheme
    "https://workoutpr.example:8443", // wrong port
    "https://workoutpr.example.evil.example", // suffix trick
    "https://sub.workoutpr.example", // subdomain
    "null", // sandboxed iframe / opaque origin
  ]) {
    assert.equal(isSameOriginRequest(request("POST", { origin })), false, origin);
  }
});

test("same-site (sibling subdomain) and other non-same-origin labels are rejected", () => {
  for (const site of ["same-site", "cross-site", "none"]) {
    assert.equal(
      isSameOriginRequest(request("POST", { origin: APP, "sec-fetch-site": site })),
      false,
      site
    );
  }
});

test("Origin must match even when Sec-Fetch-Site claims same-origin", () => {
  assert.equal(
    isSameOriginRequest(
      request("POST", {
        origin: "https://evil.example",
        "sec-fetch-site": "same-origin",
      })
    ),
    false
  );
});

test("writes with no Origin and no Sec-Fetch-Site fail closed", () => {
  assert.equal(isSameOriginRequest(request("POST")), false);
  assert.equal(rejectCrossOriginRequest(request("PUT"))?.status, 403);
});

test("Sec-Fetch-Site: same-origin without Origin is allowed", () => {
  assert.equal(
    isSameOriginRequest(request("POST", { "sec-fetch-site": "same-origin" })),
    true
  );
});

test("safe methods are never blocked", () => {
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    assert.equal(
      isSameOriginRequest(
        request(method, {
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        })
      ),
      true,
      method
    );
    assert.equal(rejectCrossOriginRequest(request(method)), null, method);
  }
});

// Structural guard: a future write handler that forgets the check fails CI.
// Auth.js routes are excluded: Auth.js protects its own POSTs with a CSRF token.
async function findRouteFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return findRouteFiles(path);
      return entry.name === "route.ts" ? [path] : [];
    })
  );
  return files.flat();
}

test("every state-changing API handler calls the origin guard first", async () => {
  const apiDir = new URL("../app/api", import.meta.url).pathname;
  const routeFiles = (await findRouteFiles(apiDir)).filter(
    (path) => !path.includes("/api/auth/")
  );
  assert.ok(routeFiles.length > 0, "no API route files found");

  let writeHandlers = 0;
  for (const path of routeFiles) {
    const source = await readFile(path, "utf8");
    const handlers = source.split(/(?=export async function )/);
    for (const handler of handlers) {
      const method = handler.match(
        /^export async function (POST|PUT|PATCH|DELETE)\b/
      )?.[1];
      if (!method) continue;
      writeHandlers += 1;

      const body = handler.slice(handler.indexOf("{") + 1);
      const firstStatement = body.trimStart().split("\n")[0];
      assert.match(
        firstStatement,
        /rejectCrossOriginRequest\(req\)/,
        `${method} in ${path} must call rejectCrossOriginRequest(req) first`
      );
    }
  }
  assert.ok(writeHandlers >= 4, `expected ≥4 write handlers, found ${writeHandlers}`);
});
