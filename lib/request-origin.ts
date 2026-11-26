/** Strict same-origin check, with a narrow loopback alias exception in local CI.
 * Never trust arbitrary forwarded host/proto headers or permit external origins.
 */
export function isAllowedRequestOrigin(origin: string | null, requestUrl: string): boolean {
  if (origin === null) return true; // Explicit bearer-token clients need not send Origin.
  try {
    const supplied = new URL(origin);
    const target = new URL(requestUrl);
    if (origin !== supplied.origin || !["http:", "https:"].includes(supplied.protocol)) return false;
    if (supplied.origin === target.origin) return true;
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
    return process.env.CI === "true"
      && process.env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:54321"
      && loopback.has(supplied.hostname) && loopback.has(target.hostname)
      && supplied.protocol === target.protocol && supplied.port === target.port;
  } catch { return false; }
}
