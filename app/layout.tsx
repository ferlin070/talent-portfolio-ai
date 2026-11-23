import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = { title: "Talent Portfolio AI | MVP", description: "Digital portfolio and career growth workspace for students and professionals" };
const nav = [["/","Home"],["/dashboard","Dashboard"],["/portfolio","Portfolio"],["/certificates","Certificate Vault"],["/skills","Skills Analysis"]];
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ms"><body><div className="layout">
    <aside className="sidebar"><div className="brand">Talentfolio <span style={{color:"#8ba7ff"}}>AI</span><div><small>YOUR GROWTH WORKSPACE</small></div></div>
      <nav className="nav" aria-label="Navigasi utama">{nav.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav>
      <p style={{fontSize:12,color:"#b7c8ee",marginTop:35}}>Demo frontend sahaja. Data contoh; belum disambung ke pangkalan data.</p>
    </aside><main className="main">{children}</main></div></body></html>;
}