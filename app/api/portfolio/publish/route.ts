import { isAllowedRequestOrigin } from "@/lib/request-origin";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { validPortfolioSlug } from "@/lib/portfolio-publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublishRequest = {
  action: "publish" | "unpublish";
  slug?: string;
  template?: string;
  sections?: Record<string, boolean>;
  noindex?: boolean;
  openToOpportunities?: boolean;
};

function response(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isAllowedRequestOrigin(origin, request.url)) {
    return response("Asal permintaan tidak dibenarkan.", 403);
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return response("Sila log masuk terlebih dahulu.", 401);
  }

  let input: PublishRequest;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 4096) {
      return response("Permintaan terlalu besar.", 413);
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return response("Input mesti objek JSON.", 400);
    }
    input = parsed as PublishRequest;
  } catch {
    return response("Format input tidak sah.", 400);
  }

  if (input.action !== "publish" && input.action !== "unpublish") {
    return response("Operasi penerbitan tidak sah.", 400);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return response("Konfigurasi database tidak tersedia.", 503);
  }

  const token = authorization.slice(7);
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser(token);
  const user = data.user;

  if (error || !user) {
    return response("Sesi tidak sah atau telah tamat.", 401);
  }
  if (!user.email_confirmed_at) {
    return response("Sahkan e-mel sebelum menerbitkan portfolio.", 403);
  }

  const prior = await client
    .from("portfolio_publications")
    .select("slug,published")
    .eq("user_id", user.id)
    .maybeSingle();

  if (prior.error) return response("Gagal membaca status portfolio.", 500);
  const oldSlug = prior.data?.slug;

  if (input.action === "unpublish") {
    if (!prior.data?.published || !oldSlug) {
      return response("Tiada portfolio awam untuk dinyahterbitkan.", 404);
    }

    const result = await client
      .from("portfolio_publications")
      .update({ published: false })
      .eq("user_id", user.id);
    if (result.error) return response("Nyahterbit portfolio gagal.", 500);

    revalidatePath(`/u/${oldSlug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json(
      { ok: true, published: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let slug: string;
  try {
    slug = validPortfolioSlug(input.slug ?? "");
  } catch (exception) {
    return response(
      exception instanceof Error ? exception.message : "Slug tidak sah.",
      400,
    );
  }

  const theme = input.template ?? "";
  const allowedThemes = [
    "modern", "minimal", "tech", "amber", "neon",
    "crimson", "sunny", "student3d", "noirluxe",
  ];

  if (!allowedThemes.includes(theme)) {
    return response("Template tidak sah.", 400);
  }

  const sections = input.sections;
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return response("Pilihan seksyen tidak sah.", 400);
  }

  for (const key of [
    "skills", "education", "experience", "projects", "location", "website",
  ]) {
    if (typeof sections[key] !== "boolean") {
      return response(`Pilihan ${key} tidak sah.`, 400);
    }
  }

  const result = await client.rpc("publish_portfolio_v2", {
    p_slug: slug,
    p_template: theme,
    p_sections: sections,
    p_noindex: input.noindex === true,
    p_open_to_opportunities: input.openToOpportunities === true,
  });

  if (result.error) {
    if (result.error.code === "23505") {
      return response("Nama pautan sudah digunakan. Sila pilih nama lain.", 409);
    }
    return response("Portfolio tidak dapat diterbitkan: " + result.error.message, 400);
  }

  revalidatePath(`/u/${slug}`);
  if (oldSlug && oldSlug !== slug) revalidatePath(`/u/${oldSlug}`);
  revalidatePath("/sitemap.xml");

  return NextResponse.json(
    { ok: true, published: true, slug },
    { headers: { "Cache-Control": "no-store" } },
  );
}
