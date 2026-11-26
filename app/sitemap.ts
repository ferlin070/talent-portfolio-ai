import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 300;

const origin = "https://talent-portfolio-ai.vercel.app";

/** Sitemap lists only published portfolios for users who did NOT opt out. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = [{ url: origin, lastModified: new Date(), priority: 1 }];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // A secret key is optional at build time; never expose private table rows.
  if (!url || !serviceKey) return home;

  const server = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await server
    .from("portfolio_publications")
    .select("slug,updated_at")
    .eq("published", true)
    .eq("noindex", false)
    .order("updated_at", { ascending: false })
    .limit(5000);

  if (error || !data) return home;

  return [
    ...home,
    ...data
      .filter((publication) =>
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publication.slug),
      )
      .map((publication) => ({
        url: `${origin}/u/${publication.slug}`,
        lastModified: publication.updated_at
          ? new Date(publication.updated_at)
          : new Date(),
        priority: 0.7,
      })),
  ];
}
