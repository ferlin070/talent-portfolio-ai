import type { MetadataRoute } from "next";

const origin = "https://talent-portfolio-ai.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/u/"],
      disallow: [
        "/dashboard", "/profile", "/projects", "/education", "/experience",
        "/certificates", "/skills", "/portfolio", "/settings", "/resume",
        "/prompt-generator", "/api/",
      ],
    }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
