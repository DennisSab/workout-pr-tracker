// CSRF protection for state-changing route handlers.
//
// Our API authenticates with the Auth.js session cookie, which the browser
// attaches automatically. Without this check, a page on another site could
// make the user's browser send POST/PUT/DELETE requests that ride on that
// cookie. Next.js applies an equivalent Origin check to Server Actions, but
// not to route handlers, so every write handler calls this guard first.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isSameOriginRequest(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  // Compare against the origin this request was actually sent to. An
  // attacker's page cannot make the victim's browser fake the Host header.
  const expectedOrigin = new URL(request.url).origin;
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");

  // Modern browsers label every request with where it came from.
  if (fetchSite !== null && fetchSite !== "same-origin") return false;

  // Browsers always send Origin on POST/PUT/PATCH/DELETE. "null" (sandboxed
  // iframes, some redirects) never equals a real origin, so it is rejected.
  if (origin !== null) return origin === expectedOrigin;

  // No Origin header: accept only if the browser vouched for it via
  // Sec-Fetch-Site; otherwise fail closed.
  return fetchSite === "same-origin";
}

export function crossOriginResponse() {
  return Response.json(
    { error: "Cross-origin request rejected." },
    { status: 403 }
  );
}

// Returns a 403 response to send back, or null when the request may proceed.
export function rejectCrossOriginRequest(request: Request): Response | null {
  return isSameOriginRequest(request) ? null : crossOriginResponse();
}
