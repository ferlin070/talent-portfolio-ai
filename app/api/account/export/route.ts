import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateTables = [
  "profiles",
  "projects",
  "project_images",
  "certificates",
  "skills",
  "education",
  "work_experience",
  "portfolio_publications",
  "dashboard_preferences",
] as const;

export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";

  if (!header.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sila log masuk." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Sistem belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const token = header.slice(7);
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Sesi tidak sah." }, { status: 401 });
  }

  // All tables are queried with the user's JWT; RLS remains enforced.
  const rows: Record<string, unknown[]> = {};
  for (const table of privateTables) {
    const result = await client
      .from(table)
      .select("*")
      .eq("user_id", data.user.id);

    if (result.error) {
      return NextResponse.json(
        { error: `Gagal mengeksport ${table}.` },
        { status: 500 },
      );
    }

    rows[table] = result.data ?? [];
  }

  const payload = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      account: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
      data: rows,
      note:
        "Eksport JSON metadata akaun. Fail imej dan sijil tidak disertakan sebagai binari.",
    },
    null,
    2,
  );

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="talentfolio-data-export.json"',
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
