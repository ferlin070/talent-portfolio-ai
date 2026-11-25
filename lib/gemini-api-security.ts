import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type Operation = "analysis" | "connection_test";

interface QuotaRow {
  allowed: boolean;
  retry_after: number;
  remaining: number;
}

type AuthorizeSuccess = {
  client: SupabaseClient;
  user: User;
};

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export function geminiError(message: string, status: number, retryAfter?: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        ...responseHeaders,
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
      },
    },
  );
}

/**
 * Never authorize against a browser-supplied user ID.
 * The caller's validated access token is used for all RLS queries.
 */
export async function authorizeGeminiRequest(
  request: NextRequest,
  operation: Operation,
): Promise<AuthorizeSuccess | NextResponse> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return geminiError("Sila log masuk untuk menggunakan Gemini.", 401);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return geminiError("Supabase belum dikonfigurasi.", 503);
  }

  const token = authorization.slice("Bearer ".length).trim();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return geminiError("Sesi telah tamat. Sila log masuk semula.", 401);
  }

  if (!data.user.email_confirmed_at) {
    return geminiError("Sahkan alamat e-mel sebelum menjana analisis Gemini.", 403);
  }

  const quota = await client.rpc("consume_api_quota", {
    p_operation: operation,
  });

  if (quota.error) {
    return geminiError(
      "Had keselamatan Gemini belum tersedia. Hubungi pentadbir sistem.",
      503,
    );
  }

  const usage = (quota.data as QuotaRow[] | null)?.[0];
  if (!usage) {
    return geminiError("Status kuota tidak dapat disahkan.", 503);
  }

  if (!usage.allowed) {
    return geminiError(
      operation === "analysis"
        ? "Had 5 analisis setiap jam telah dicapai."
        : "Had 10 ujian sambungan setiap jam telah dicapai.",
      429,
      Math.max(1, usage.retry_after),
    );
  }

  return { client, user: data.user };
}

/** Stream the body and stop at the hard byte limit; ignore Content-Length. */
export async function readJsonBody<T>(
  request: NextRequest,
  limitBytes = 16 * 1024,
): Promise<T> {
  const reader = request.body?.getReader();
  if (!reader) {
    throw new Error("Permintaan kosong.");
  }

  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > limitBytes) {
        await reader.cancel();
        throw new Error("Saiz permintaan melebihi 16 KB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  try {
    const parsed:unknown=JSON.parse(new TextDecoder().decode(merged));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Input mesti objek JSON.");
    return parsed as T;
  } catch {
    throw new Error("Format JSON tidak sah.");
  }
}
