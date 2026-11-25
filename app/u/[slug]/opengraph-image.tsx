import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const alt = "Pratonton portfolio profesional — Talentfolio AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let name = "Portfolio Profesional";
  let headline = "Skills · Projek · Pengalaman";

  if (base && key && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    const client = createClient(base, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data } = await client.rpc("get_published_portfolio_seo", {
      p_slug: slug,
    });

    const snapshot = Array.isArray(data) ? data[0]?.snapshot : null;
    if (snapshot) {
      name = String(snapshot.name || name).slice(0, 90);
      headline = String(snapshot.headline || headline).slice(0, 160);
    }
  }

  return new ImageResponse(
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      background: "linear-gradient(135deg, #0d1d36 0%, #263e78 70%, #405c9c 100%)",
      color: "#ffffff",
      padding: "74px 84px",
      fontFamily: "sans-serif",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        fontSize: 25, fontWeight: 800, color: "#c4d5ff",
      }}>
        <div style={{
          display: "flex", width: 32, height: 32,
          borderRadius: 8, marginRight: 15, backgroundColor: "#7994ff",
        }} />
        TALENTFOLIO AI
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{
          color: "#aebff5", fontSize: 22, letterSpacing: 5, marginBottom: 24,
        }}>
          DIGITAL PROFESSIONAL PORTFOLIO
        </div>
        <div style={{
          fontSize: name.length > 45 ? 58 : 76,
          fontWeight: 900, lineHeight: 1.12,
          overflowWrap: "break-word",
        }}>
          {name}
        </div>
        <div style={{
          marginTop: 22, fontSize: 30, color: "#dbe6ff", maxWidth: 980,
        }}>
          {headline}
        </div>
      </div>
      <div style={{
        display: "flex", alignItems: "center",
        borderTop: "1px solid #7b90c2", paddingTop: 23,
        fontSize: 22, color: "#b5c7e8",
      }}>
        talent-portfolio-ai.vercel.app
      </div>
    </div>,
    size,
  );
}
