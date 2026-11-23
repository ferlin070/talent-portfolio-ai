import type { Metadata } from "next";
import "./globals.css";
import "./portfolio-premium.css";
import "./portfolio-new-themes.css";
import "./portfolio-expansion.css";
export const metadata: Metadata = {
 title: "Talentfolio AI — Portfolio, Certificates & Career Growth",
 description: "A premium digital portfolio and personal growth workspace for students and professionals."
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ms"><body>{children}</body></html>}
