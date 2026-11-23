import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Globe2, UserRound, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
export const dynamic="force-dynamic";
type Snap={name?:string;headline?:string;bio?:string;location?:string;website?:string;skills?:{name:string}[];projects?:{title:string;description:string;url:string}[]};
function safeLink(url:string){try{const u=new URL(url);return ["https:","http:"].includes(u.protocol)?u.toString():null}catch{return null}}
export default async function PublicPortfolio({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!/^[a-z0-9-]{3,48}$/.test(slug))notFound();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error("Supabase public configuration is missing.");
 const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await supabase.from("portfolio_publications").select("slug,template,snapshot").eq("slug",slug).eq("published",true).maybeSingle();
 if(error||!data)notFound();
 const snap=(data.snapshot||{}) as Snap;
 return <main className={`tf-public tf-public-theme-${data.template||"modern"}`}><header className="tf-public-nav"><Link href="/"><span style={{color:"#5876dc"}}>✦</span> talentfolio</Link><Link href="/"><ArrowLeft size={14} style={{display:"inline",verticalAlign:"middle"}}/> Back to Talentfolio</Link></header>
 <div className="tf-public-main"><div className="tf-public-hero"><div><small>WELCOME TO MY PORTFOLIO</small><h1>{snap.name||"Professional Portfolio"}</h1><h2 style={{fontSize:21}}>{snap.headline||""}</h2><p>{snap.bio||""}</p>{snap.location&&<p>📍 {snap.location}</p>}{snap.website&&safeLink(snap.website)&&<a className="tf-btn" href={safeLink(snap.website)!} target="_blank" rel="noopener noreferrer"><Globe2 size={15}/> Visit website</a>}</div><div className="tf-public-portrait"><UserRound size={90}/></div></div>
 {Array.isArray(snap.skills)&&snap.skills.length>0&&<section className="tf-public-section"><h2>Skills & Expertise</h2><div className="tf-chips">{snap.skills.map((s,i)=><span key={i}>{s.name}</span>)}</div></section>}
 {Array.isArray(snap.projects)&&snap.projects.length>0&&<section className="tf-public-section"><h2>Featured Projects</h2><div className="tf-public-projects">{snap.projects.map((p,i)=><article key={i}><h3>{p.title}</h3><p>{p.description}</p>{p.url&&safeLink(p.url)&&<a className="tf-text-link" href={safeLink(p.url)!} target="_blank" rel="noopener noreferrer">View project →</a>}</article>)}</div></section>}
 <footer className="tf-public-section" style={{fontSize:12,color:"#8d9b92"}}>Made with Talentfolio AI · Portfolio owner controls published information</footer></div></main>;
}
