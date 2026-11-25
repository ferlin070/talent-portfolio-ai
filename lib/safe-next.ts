// Shared by the browser, middleware and OAuth/email callback.
const base = "https://talentfolio.invalid";
export function safeNext(value: string | null): string {
  const fallback = "/dashboard";
  if (!value || !value.startsWith("/") || value.startsWith("//") ||
      /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const target = new URL(value, base);
    if (target.origin !== base || target.pathname.startsWith("//") ||
        /%2f|%5c/i.test(target.pathname)) return fallback;
    if (target.pathname === "/auth" || target.pathname.startsWith("/auth/")) return fallback;
    return target.pathname + target.search + target.hash;
  } catch { return fallback; }
}
