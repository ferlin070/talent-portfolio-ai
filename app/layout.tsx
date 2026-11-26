import type { Metadata } from "next";
import ThemeInitializer from "@/components/theme-initializer";
import "./globals.css";
import "./portfolio-premium.css";
import "./portfolio-new-themes.css";
import "./portfolio-expansion.css";
import "./project-gallery.css";
import "./quality-fixes.css";
import "./phase3-premium.css";
import "./career-studio.css";
export const metadata: Metadata = {
 title: "Talentfolio AI — Portfolio, Certificates & Career Growth",
 description: "A premium digital portfolio and personal growth workspace for students and professionals.",
 icons: { icon: [{ url: "/icon.svg?v=3", type: "image/svg+xml" }], shortcut: "/icon.svg?v=3" }
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ms"><body><a href="#tf-main-content" className="tf-skip-link">Langkau ke kandungan utama</a><ThemeInitializer/>{children}</body></html>}
