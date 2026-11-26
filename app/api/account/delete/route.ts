import { isAllowedRequestOrigin } from "@/lib/request-origin";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeletionInput = { confirmationEmail?: unknown };

function failure(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Collect files under the authenticated user's path before deleting any.
 * This handles nested gallery folders and storage pagination.
 */
async function removeUserFiles(
  bucket: string,
  userId: string,
  url: string,
  serviceKey: string,
) {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const paths: string[] = [];
  const visited = new Set<string>();

  async function collect(prefix: string, depth: number): Promise<void> {
    if (depth > 5 || visited.has(prefix)) {
      throw new Error("Struktur folder Storage tidak disokong.");
    }
    visited.add(prefix);

    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) throw new Error(`Gagal membaca Storage ${bucket}.`);
      const entries = data ?? [];

      for (const entry of entries) {
        const path = `${prefix}/${entry.name}`;
        if (!path.startsWith(`${userId}/`)) {
          throw new Error("Lokasi Storage tidak selamat.");
        }
        if (!entry.id) {
          await collect(path, depth + 1);
        } else {
          paths.push(path);
        }
      }

      if (entries.length < 100) break;
      offset += 100;
    }
  }

  await collect(userId, 0);

  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100);
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw new Error(`Gagal memadam Storage ${bucket}.`);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isAllowedRequestOrigin(origin, request.url)) {
    return failure("Asal permintaan tidak dibenarkan.", 403);
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return failure("Sila log masuk untuk memadam akaun.", 401);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return failure("Fungsi pemadaman akaun belum diaktifkan oleh pentadbir.", 503);
  }

  let input: DeletionInput;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 2048) {
      return failure("Permintaan terlalu besar.", 413);
    }
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return failure("Input mesti objek JSON.", 400);
    }
    input = parsed as DeletionInput;
  } catch {
    return failure("Input tidak sah.", 400);
  }

  const token = authorization.slice(7);
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) {
    return failure("Sesi telah tamat.", 401);
  }

  const currentEmail = data.user.email?.trim().toLowerCase() ?? "";
  if (
    typeof input.confirmationEmail !== "string" ||
    input.confirmationEmail.trim().toLowerCase() !== currentEmail
  ) {
    return failure("Taip alamat e-mel akaun dengan tepat untuk mengesahkan.", 400);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    for (const bucket of ["certificates", "profile-photos", "project-gallery"]) {
      await removeUserFiles(bucket, data.user.id, url, serviceKey);
    }

    // Auth FK cascades remove user-owned rows; cleanup queue preserves any
    // previously enqueued paths for the scheduled orphan cleaner.
    const deletion = await admin.auth.admin.deleteUser(data.user.id);
    if (deletion.error) {
      return failure("Gagal memadam akaun. Hubungi pentadbir.", 500);
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return failure(
      "Pemadaman belum selesai kerana fail Storage tidak dapat dibersihkan. Cuba lagi.",
      500,
    );
  }
}
