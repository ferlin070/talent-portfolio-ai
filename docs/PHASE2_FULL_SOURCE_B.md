# Talentfolio AI — Fasa 2: Kod Penuh, Bahagian B

Branch: `feature/phase2-publishing-ux`. Laman awam, kesemua sembilan tema, SEO dan perkongsian.

## 1. `app/u/[slug]/page.tsx`

````tsx
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type {PublishedImage} from "@/components/project-gallery-public";
import PublicPortfolioClassic from "@/components/public-portfolio-classic";
import type { Metadata } from "next";
import PortfolioThemes, {type NewTheme} from "@/components/portfolio-themes";
import ExpansionThemes,{type ExpansionTheme} from "@/components/portfolio-expansion";
export const revalidate=300; // ISR fallback: authenticated publish route invalidates immediately.

type Snap={
 name?:string;headline?:string;bio?:string;location?:string;website?:string;avatar?:string;open_to_opportunities?:boolean;
 skills?:{name:string}[];
 projects?:{title:string;description:string;url:string;images?:PublishedImage[]}[];
 education?:{institution:string;qualification:string;field:string;start:number|null;end:number|null;description:string}[];
 experience?:{company:string;role:string;start:string|null;end:string|null;description:string}[];
};
type Portfolio={slug:string;template:string;snapshot:Snap;noindex:boolean;updated_at:string};
function validWebsite(raw:string){try{const u=new URL(raw);return ["https:","http:"].includes(u.protocol)?u.toString():null}catch{return null}}
function validAvatar(raw:string){
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL||"";
 if(!base)return null;
 try {const u=new URL(raw);const project=new URL(base);return u.origin===project.origin&&u.pathname.startsWith("/storage/v1/object/public/profile-photos/")?raw:null} catch{return null}
}
async function fetchPortfolio(slug:string):Promise<Portfolio>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>48)notFound();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error("Public portfolio database configuration is missing");
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc("get_published_portfolio_seo",{p_slug:slug});
 if(error||!Array.isArray(data)||data.length!==1)notFound();
 const published=data[0] as Portfolio;
 return {slug:published.slug,template:published.template,snapshot:published.snapshot||{},noindex:published.noindex===true,updated_at:published.updated_at};
}
const siteOrigin="https://talent-portfolio-ai.vercel.app";

export async function generateMetadata(
 {params}:{params:Promise<{slug:string}>}
):Promise<Metadata>{
 const {slug}=await params;
 const publication=await fetchPortfolio(slug);
 const snapshot=publication.snapshot;
 const name=snapshot.name?.trim()||"Portfolio Profesional";
 const headline=snapshot.headline?.trim()||"Portfolio";
 const description=(snapshot.bio?.trim()||`Profil profesional ${name}`).slice(0,155);
 const title=`${name} — ${headline} | Talentfolio AI`;
 const url=`${siteOrigin}/u/${publication.slug}`;

 return {
  title,
  description,
  alternates:{canonical:url},
  robots:publication.noindex
   ?{index:false,follow:false,nocache:true}
   :{index:true,follow:true},
  openGraph:{
   title,description,url,type:"profile",locale:"ms_MY",
   siteName:"Talentfolio AI",
   images:[{url:`${url}/opengraph-image`,width:1200,height:630,alt:title}]
  },
  twitter:{
   card:"summary_large_image",title,description,
   images:[`${url}/opengraph-image`]
  }
 };
}

export default async function PublicPortfolio({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const portfolio=await fetchPortfolio(slug);
 const s=portfolio.snapshot;
 const name=s.name?.trim()||"Professional Portfolio",first=name.split(" ")[0];
 const projects=Array.isArray(s.projects)?s.projects:[];
 const skills=Array.isArray(s.skills)?s.skills:[];
 const educations=Array.isArray(s.education)?s.education:[];
 const experiences=Array.isArray(s.experience)?s.experience:[];
 const avatar=s.avatar?validAvatar(s.avatar):null,website=s.website?validWebsite(s.website):null;
 const imageBase=(process.env.NEXT_PUBLIC_SUPABASE_URL||"")+"/storage/v1/object/public/project-gallery/";
 const safeProjects=projects.map(p=>({
  ...p,
  images:(Array.isArray(p.images)?p.images:[])
   .map(im=>{
     const prefix="/storage/v1/object/public/project-gallery/";
     const value=im.url.startsWith(prefix)
       ?`${process.env.NEXT_PUBLIC_SUPABASE_URL||""}${im.url}`
       :im.url;
     return {...im,url:value};
   })
   .filter(im=>{
     try{
       const imageUrl=new URL(im.url);
       return imageUrl.protocol==="https:"&&imageUrl.href.startsWith(imageBase);
     }catch{return false;}
   })
   .slice(0,12)
 }));
 if(["sunny","student3d","noirluxe"].includes(portfolio.template)){
  return <ExpansionThemes theme={portfolio.template as ExpansionTheme} name={name} headline={s.headline||""}
   bio={s.bio||""} location={s.location||""} avatar={avatar||""} website={website||""}
   skills={skills.map(x=>({name:x.name}))} openToOpportunities={s.open_to_opportunities===true}
   projects={safeProjects.map(x=>({title:x.title,description:x.description,url:x.url,images:x.images}))}
   education={educations.map(x=>({institution:x.institution,qualification:x.qualification,field:x.field,start:x.start,end:x.end,description:x.description}))}
   experience={experiences.map(x=>({company:x.company,role:x.role,start:x.start,end:x.end,description:x.description}))}/>;
 }
 if(["amber","neon","crimson"].includes(portfolio.template)){
   return <PortfolioThemes theme={portfolio.template as NewTheme}
    name={name} headline={s.headline||""} bio={s.bio||""} location={s.location||""}
    avatar={avatar||""} website={website||""}
    skills={skills.map(x=>({name:x.name}))} openToOpportunities={s.open_to_opportunities===true}
    projects={safeProjects.map(p=>({title:p.title,description:p.description,url:p.url,images:p.images}))}
    education={educations.map(x=>({institution:x.institution,qualification:x.qualification,field:x.field,start:x.start,end:x.end,description:x.description}))}
    experience={experiences.map(x=>({company:x.company,role:x.role,start:x.start,end:x.end,description:x.description}))}/>;
 }
 return <PublicPortfolioClassic
  template={portfolio.template}
  s={s}
  avatar={avatar||""}
  website={website||""}
  safeProjects={safeProjects}
 />;
}

````

## 2. `components/public-portfolio-classic.tsx`

````tsx
import ProjectMedia from "@/components/project-media";
import Link from "next/link";
import {
  ArrowDownRight, ArrowUpRight, BriefcaseBusiness, Code2,
  Globe2, GraduationCap, MapPin, Sparkles, UserRound, ExternalLink,
} from "lucide-react";
import { type PublishedImage } from "@/components/project-gallery-public";

function validWebsite(raw:string){
 try{
  const url=new URL(raw);
  return url.protocol==="https:"||url.protocol==="http:"?url.toString():null;
 }catch{return null;}
}

export type PublicPortfolioSnapshot = {
  name?:string;headline?:string;bio?:string;location?:string;
  website?:string;avatar?:string;open_to_opportunities?:boolean;
  skills?:{name:string}[];
  projects?:{title:string;description:string;url:string;images?:PublishedImage[]}[];
  education?:{institution:string;qualification:string;field:string;start:number|null;end:number|null;description:string}[];
  experience?:{company:string;role:string;start:string|null;end:string|null;description:string}[];
};

export type PublicPortfolioProject = {
  title:string;description:string;url:string;images?:PublishedImage[];
};

/** Same Classic template on /u/[slug] and Portfolio Builder preview. */
export default function PublicPortfolioClassic({
  template, s, avatar, website, safeProjects
}:{
  template:string;
  s:PublicPortfolioSnapshot;
  avatar:string;
  website:string;
  safeProjects:PublicPortfolioProject[];
}){
  const name=s.name?.trim()||"Professional Portfolio";
  const first=name.split(" ")[0];
  const projects=Array.isArray(s.projects)?s.projects:[];
  const skills=Array.isArray(s.skills)?s.skills:[];
  const educations=Array.isArray(s.education)?s.education:[];
  const experiences=Array.isArray(s.experience)?s.experience:[];
 const classes=["modern","minimal","tech"].includes(template)?template:"modern";
 return <div className={`tf-public-v2 tf-public-v2-${classes}`}>
  <header className="tf-public-v2-nav"><div className="tf-public-v2-navinner"><a href="#home" className="tf-public-v2-logo">{name}<span>✳</span></a><nav aria-label="Portfolio navigation"><a href="#about">About</a><a href="#work">Work</a><a href="#expertise">Expertise</a>{experiences.length>0&&<a href="#experience">Experience</a>}{educations.length>0&&<a href="#education">Education</a>}</nav><a className="tf-public-v2-contact" href="#contact">Let&apos;s connect <ArrowUpRight size={16}/></a></div></header>
  <main id="home"><section className="tf-public-v2-hero"><div className="tf-public-v2-heromain"><div className="tf-public-v2-intro"><span className="tf-public-v2-kicker"><span className="tf-public-v2-status"/> HELLO, WELCOME TO MY WORLD</span>
    <h1>Hi, I&apos;m <em>{first}.</em><br/><span>Skills &</span><br/><i>work.</i></h1><p className="tf-public-v2-role">{s.headline||"Professional Portfolio & Creative Journey"}</p><p className="tf-public-v2-description">{s.bio||"A journey of creativity, learning and building meaningful work."}</p>
    <div className="tf-public-v2-actions"><a className="tf-public-v2-primary" href="#work">Explore My Work <ArrowUpRight size={18}/></a><a className="tf-public-v2-secondary" href="#about">More About Me <ArrowDownRight size={18}/></a></div>
    {(s.location||s.open_to_opportunities)&&<div className="tf-public-v2-location">{s.location&&<><MapPin size={16}/>{s.location}</>}{s.location&&s.open_to_opportunities&&<span>·</span>}{s.open_to_opportunities&&"Terbuka kepada peluang kerjaya"}</div>}
  </div><div className="tf-public-v2-art"><div className="tf-public-v2-ring r1"/><div className="tf-public-v2-ring r2"/><div className="tf-public-v2-portrait">{avatar?<img src={avatar} alt={`Portrait of ${name}`}/>:<UserRound size={115}/>}</div><div className="tf-public-v2-floating"><Sparkles size={16}/> Always evolving</div><span className="tf-public-v2-art-star">✳</span></div></div>
  <div className="tf-public-v2-stats"><div><strong>{String(projects.length).padStart(2,"0")}</strong><span>Projects</span></div><div><strong>{String(skills.length).padStart(2,"0")}</strong><span>Skills & strengths</span></div><div><strong>{String(educations.length+experiences.length).padStart(2,"0")}</strong><span>Career milestones</span></div><div><strong>{String(safeProjects.reduce((sum,p)=>sum+(p.images?.length||0),0)).padStart(2,"0")}</strong><span>Project images</span></div></div></section>
  <section className="tf-public-v2-about tf-public-v2-section" id="about"><div className="tf-public-v2-label">01 / THE PERSON BEHIND THE WORK</div><div className="tf-public-v2-aboutgrid"><h2>A little about <em>my story.</em></h2><div><p>{s.bio||"Driven by curiosity, growth and a passion for solving real problems."}</p><span className="tf-public-v2-smallnote">Every project is another chapter of learning and creating with purpose.</span></div></div></section>
  <section className="tf-public-v2-section tf-public-v2-work" id="work"><div className="tf-public-v2-label">02 / WHAT I&apos;VE BEEN BUILDING</div><div className="tf-public-v2-titleline"><h2>Selected <em>work.</em></h2><span>PROJECT SHOWCASE <ArrowUpRight size={17}/></span></div>
   {projects.length?<div className="tf-public-v2-projectgrid">{safeProjects.map((p,i)=><article className="tf-public-v2-project" key={i}><div className="tf-public-v2-project-art"><ProjectMedia project={p}/>{false&&<><div className="tf-public-v2-project-articon"><Code2 size={35}/></div><span>PROJECT / {String(i+1).padStart(2,"0")}</span></>}</div><div className="tf-public-v2-project-details"><span>FEATURED PROJECT · {String(i+1).padStart(2,"0")}</span><h3>{p.title}</h3><p>{p.description||"Explore this project and the journey behind it."}</p>{p.url&&validWebsite(p.url)?<a href={validWebsite(p.url)!} rel="noopener noreferrer" target="_blank">Visit Project <ExternalLink size={15}/></a>:<span className="tf-public-v2-no-link">Project showcase</span>}</div></article>)}</div>:<div className="tf-public-v2-empty">Featured projects are coming soon.</div>}
  </section>
  <section className="tf-public-v2-expertise tf-public-v2-section" id="expertise"><div className="tf-public-v2-label">03 / WHAT I BRING TO THE TABLE</div><div className="tf-public-v2-titleline"><h2>My <em>expertise.</em></h2><span><Globe2 size={17}/> ALWAYS LEARNING</span></div>
   <div className="tf-public-v2-skillgrid">{skills.length?skills.map((x,i)=><div key={i} className="tf-public-v2-skill"><span>{String(i+1).padStart(2,"0")}</span><b>{x.name}</b><ArrowUpRight size={16}/></div>):<div className="tf-public-v2-empty">Skill highlights will appear here.</div>}</div>
  </section>
  {experiences.length>0&&<section className="tf-public-v2-section tf-public-v2-journey" id="experience"><div className="tf-public-v2-label">04 / PROFESSIONAL HISTORY</div><h2>Work <em>experience.</em></h2><div className="tf-public-v2-history">{experiences.map((x,i)=><article key={`work-${i}`}><div className="tf-public-v2-history-icon"><BriefcaseBusiness size={20}/></div><div><span>{x.start||"—"} — {x.end||"Present"}</span><h3>{x.role}</h3><b>{x.company}</b><p>{x.description}</p></div></article>)}</div></section>}
  {educations.length>0&&<section className="tf-public-v2-section tf-public-v2-journey" id="education"><div className="tf-public-v2-label">05 / EDUCATIONAL JOURNEY</div><h2>Education &amp; <em>training.</em></h2><div className="tf-public-v2-history">{educations.map((x,i)=><article key={`edu-${i}`}><div className="tf-public-v2-history-icon"><GraduationCap size={20}/></div><div><span>{x.start||"—"} — {x.end||"Present"}</span><h3>{x.qualification}</h3><b>{x.institution}{x.field?" · "+x.field:""}</b><p>{x.description}</p></div></article>)}</div></section>}
  <section className="tf-public-v2-cta" id="contact"><div className="tf-public-v2-label">LET&apos;S CREATE SOMETHING MEANINGFUL</div><h2>Have something<br/><em>in mind?</em></h2><p>{s.open_to_opportunities?"Terbuka kepada peluang kerjaya dan kolaborasi.":"Maklumat dan pautan profesional pemilik portfolio."}</p>{website?<a href={website} target="_blank" rel="noopener noreferrer">Let&apos;s Connect <ArrowUpRight size={20}/></a>:<span className="tf-public-v2-cta-small">Connect via my professional network.</span>}</section>
  </main><footer className="tf-public-v2-footer"><span>© {new Date().getFullYear()} {name}. All rights reserved.</span><Link href="/">Built with Talentfolio AI ✳</Link><a href="#home">Back to top ↑</a></footer>
 </div>;
}

````

## 3. `components/portfolio-preview.tsx`

````tsx
import ProjectMedia from "@/components/project-media";
import Link from "next/link";
import {ProjectGallery,type PublishedImage} from "@/components/project-gallery-public";
import { ArrowUpRight, BriefcaseBusiness, Code2, GraduationCap, MapPin, Sparkles, UserRound } from "lucide-react";
type Project={id:string;title:string;description:string;url:string|null;is_public:boolean;images?:PublishedImage[]};
type Edu={id:string;institution:string;qualification:string;field_of_study:string;start_year:number|null;end_year:number|null};
type Experience={id:string;company:string;role:string;start_date:string|null;end_date:string|null};
type Skill={id:string;name:string};
export default function PortfolioPreview({name,headline,bio,location,avatar,theme,skills,projects,education,experience,openToOpportunities=false}:{
 name:string;headline:string;bio:string;location:string;avatar:string;theme:"modern"|"minimal"|"tech";skills:Skill[];projects:Project[];education:Edu[];experience:Experience[];openToOpportunities?:boolean;
}){
 const showProjects=projects.filter(p=>p.is_public);
 return <div className={`tf-pv tf-pv-${theme}`}>
  <div className="tf-pv-navbar"><div className="tf-pv-wordmark">{name||"Your Name"}<span className="tf-pv-spark">✳</span></div><div className="tf-pv-navlinks"><span>About</span><span>Work</span><span>Expertise</span></div>{openToOpportunities&&<div className="tf-pv-available"><span/> Terbuka kepada peluang kerjaya</div>}</div>
  <div className="tf-pv-hero"><div className="tf-pv-left"><span className="tf-pv-kicker"><Sparkles size={14}/> PERSONAL PORTFOLIO · {new Date().getFullYear()}</span><h2>Hello, I&apos;m <em>{name?.split(" ")[0]||"Your Name"}.</em></h2><p className="tf-pv-role">{headline||"Your professional headline goes here."}</p><p className="tf-pv-bio">{bio||"Showcase what drives you, what you are building, and the impact you want to make. Add your story from My Profile."}</p>
   <div className="tf-pv-buttons"><Link href="/resume" className="tf-pv-primary">Download Resume <ArrowUpRight size={16}/></Link><Link href="/profile" className="tf-pv-secondary">Edit Profile <ArrowUpRight size={16}/></Link></div>
   {(location||openToOpportunities)&&<div className="tf-pv-location">{location&&<><MapPin size={15}/> {location}</>}{location&&openToOpportunities&&<span className="tf-pv-dot">•</span>}{openToOpportunities&&"Terbuka kepada kolaborasi"}</div>}
  </div><div className="tf-pv-visual"><div className="tf-pv-orbit tf-pv-orbit-one"/><div className="tf-pv-orbit tf-pv-orbit-two"/><div className="tf-pv-photo">{avatar?<img src={avatar} alt={name||"Profile portrait"}/>:<UserRound size={96}/>}</div><div className="tf-pv-float"><span>✦</span> Always evolving</div></div></div>
  <div className="tf-pv-metrics"><div><strong>{String(projects.length).padStart(2,"0")}</strong><span>Projects built</span></div><div><strong>{String(skills.length).padStart(2,"0")}</strong><span>Core skills</span></div><div><strong>{String(education.length+experience.length).padStart(2,"0")}</strong><span>Career milestones</span></div><div className="tf-pv-metric-final"><strong>∞</strong><span>Room to grow</span></div></div>
  <div className="tf-pv-section"><div className="tf-pv-section-title"><div><small>01 / SELECTED WORK</small><h3>Things I&apos;ve <em>created.</em></h3></div><BriefcaseBusiness size={27}/></div><div className="tf-pv-projects">{showProjects.length?showProjects.map((p,i)=><article className="tf-pv-project" key={p.id}><span className="tf-pv-project-number">0{i+1} / PROJECT</span><ProjectMedia project={p}/><h4>{p.title}</h4><p>{p.description||"Featured professional project."}</p><span className="tf-pv-project-link">Explore project <ArrowUpRight size={14}/></span></article>):<div className="tf-pv-empty">Your featured projects will appear here once you add them.</div>}</div></div>
  <div className="tf-pv-section tf-pv-expertise"><div className="tf-pv-section-title"><div><small>02 / SKILLS & EXPERIENCE</small><h3>My creative <em>toolkit.</em></h3></div><GraduationCap size={27}/></div><div className="tf-pv-tags">{skills.length?skills.map(x=><span key={x.id}>{x.name}<ArrowUpRight size={13}/></span>):<span>Add skills from Skills Analysis</span>}</div></div>
  <footer className="tf-pv-footer"><span>Built to evolve with you.</span><span>Made with Talentfolio AI ✳</span></footer>
 </div>
}

````

## 4. `components/portfolio-themes.tsx`

````tsx
import ProjectMedia from "@/components/project-media";
import {ProjectGallery,type PublishedImage} from "@/components/project-gallery-public";
import { ArrowDown, ArrowRight, ArrowUpRight, BriefcaseBusiness, Code2, Database, ExternalLink, Globe2, GraduationCap, Laptop2, Layers3, MapPin, Server, TerminalSquare, UserRound, Zap } from "lucide-react";

export type NewTheme = "amber"|"neon"|"crimson";
export type ThemeProject = {title:string;description:string;url?:string|null;images?:PublishedImage[]};
export type ThemeSkill = {name:string;self_rating?:number|null};
export type ThemeEducation = {institution:string;qualification:string;field?:string;start?:number|null;end?:number|null;description?:string};
export type ThemeExperience = {company:string;role:string;start?:string|null;end?:string|null;description?:string};
export type ThemeProps = {
 theme:NewTheme;name:string;headline:string;bio:string;location:string;avatar:string;website:string;
 skills:ThemeSkill[];projects:ThemeProject[];education:ThemeEducation[];experience:ThemeExperience[];preview?:boolean;openToOpportunities?:boolean;
};
const safe=(value?:string|null)=>{if(!value)return null;try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)?u.toString():null}catch{return null}};
const first=(name:string)=>name.trim().split(/\s+/)[0]||"Your Name";
const two=(n:number)=>String(n).padStart(2,"0");
function Portrait({name,avatar}: {name:string;avatar:string}){return <div className="tpl-portrait">{avatar?<img src={avatar} alt={`Portrait of ${name}`} loading="lazy"/>:<div className="tpl-avatar-empty"><UserRound size={90} strokeWidth={1.25}/></div>}</div>}
function Skills({skills}:{skills:ThemeSkill[]}){return skills.length?<>{skills.map((s,i)=><div className="tpl-skill" key={i}><span>{two(i+1)}</span><strong>{s.name}</strong>{typeof s.self_rating==="number"&&s.self_rating>0&&<div className="tpl-skill-meter"><div style={{width:`${Math.min(100,s.self_rating*20)}%`}}/></div>}<Zap size={15}/></div>)}</>:<p className="tpl-empty">Your skills will appear here when you add them.</p>}
function Works({projects}:{projects:ThemeProject[]}){return projects.length?<div className="tpl-project-grid">{projects.slice(0,6).map((p,i)=><article className="tpl-project" key={i}><div className="tpl-project-visual"><ProjectMedia project={p}/>{false&&<><div className="tpl-project-window"><span/><span/><span/></div><div className="tpl-project-icon">{i%3===0?<TerminalSquare size={40}/>:i%3===1?<Layers3 size={40}/>:<Database size={40}/>}</div><div className="tpl-project-number">{two(i+1)}</div></>}</div><div className="tpl-project-content"><small>FEATURED PROJECT / {two(i+1)}</small><h3>{p.title}</h3><p>{p.description||"A featured professional project."}</p>{safe(p.url)?<a href={safe(p.url)!} target="_blank" rel="noopener noreferrer">View project <ArrowUpRight size={15}/></a>:<span className="tpl-project-muted">Portfolio showcase</span>}</div></article>)}</div>:<div className="tpl-empty">Add featured projects in your workspace to populate this section.</div>}
function Journey({education,experience}:{education:ThemeEducation[];experience:ThemeExperience[]}){if(!education.length&&!experience.length)return null;return <div className="tpl-journey-separate">
 {experience.length>0&&<section id="experience" className="tpl-section tpl-journey"><div className="tpl-section-heading"><small>CAREER JOURNEY</small><h2>Work Experience<span>.</span></h2></div><div className="tpl-journey-grid">{experience.map((w,i)=><article key={`w-${i}`}><div className="tpl-journey-icon"><BriefcaseBusiness size={19}/></div><div><small>{w.start||"—"} — {w.end||"Present"}</small><h3>{w.role}</h3><strong>{w.company}</strong>{w.description&&<p>{w.description}</p>}</div></article>)}</div></section>}
 {education.length>0&&<section id="education" className="tpl-section tpl-journey"><div className="tpl-section-heading"><small>ACADEMIC JOURNEY</small><h2>Education &amp; Training<span>.</span></h2></div><div className="tpl-journey-grid">{education.map((e,i)=><article key={`e-${i}`}><div className="tpl-journey-icon"><GraduationCap size={19}/></div><div><small>{e.start||"—"} — {e.end||"Present"}</small><h3>{e.qualification}</h3><strong>{e.institution}{e.field?` · ${e.field}`:""}</strong>{e.description&&<p>{e.description}</p>}</div></article>)}</div></section>}
 </div>}

const social=(website:string)=>safe(website);
function Header({theme,name,website}:{theme:NewTheme;name:string;website:string}){return <header className="tpl-header"><a className="tpl-logo" href="#top"><span>{theme==="crimson"?"✳":theme==="neon"?"⬡":"D"}</span>{theme==="amber"?"DEVFUSION":theme==="neon"?"DevPortfolio":name}</a><nav aria-label="Portfolio sections"><a href="#about">About</a><a href="#skills">Skills</a><a href="#projects">Projects</a><a href="#journey">Journey</a><a href="#contact">Contact</a></nav><a className="tpl-header-button" href={social(website)||"#contact"} target={social(website)?"_blank":undefined} rel={social(website)?"noopener noreferrer":undefined}>{theme==="neon"?"Let's Talk":"LET'S TALK"} <ArrowUpRight size={14}/></a></header>}

function Amber({p}:{p:ThemeProps}){
 return <div className="tpl tpl-amber" id="top">
 <Header theme="amber" name={p.name} website={p.website}/>
 <section className="tpl-hero tpl-amber-hero"><div className="tpl-hero-copy"><span className="tpl-kicker">— HELLO, I&apos;M</span><h1>{p.name||"Your Name"}<span className="tpl-caret">|</span></h1><h2>{p.headline||"Creative Full-Stack Developer"}</h2><p>{p.bio||"I build thoughtful digital experiences that help people and businesses grow."}</p><div className="tpl-actions"><a href="#contact" className="tpl-primary">CONTACT <ArrowRight size={16}/></a><a href="#projects" className="tpl-outline">VIEW MY WORK <ArrowUpRight size={15}/></a></div>{p.openToOpportunities&&<div className="tpl-available"><span/> AVAILABLE FOR OPPORTUNITIES</div>}</div>
 <div className="tpl-hero-portrait"><div className="tpl-orbit orbit-a"/><div className="tpl-orbit orbit-b"/><Portrait avatar={p.avatar} name={p.name}/><span className="tpl-tech-tag tag-1"><Code2 size={14}/> Web</span><span className="tpl-tech-tag tag-2"><Database size={14}/> SQL</span><span className="tpl-tech-tag tag-3"><Server size={14}/> Cloud</span></div></section>
 <section className="tpl-about tpl-section" id="about"><div><span className="tpl-kicker">ABOUT ME</span><h2>Building digital solutions<br/> that make a <em>difference.</em></h2><p>{p.bio||"Purposeful design, clear code and steady growth."}</p><div className="tpl-about-stats"><div><strong>{p.projects.length}+</strong><small>Projects</small></div><div><strong>{p.skills.length}+</strong><small>Skills</small></div><div><strong>{p.experience.length}+</strong><small>Roles</small></div></div></div><div className="tpl-info-card"><h3>Profile overview</h3><p><UserRound size={16}/> {p.name}</p><p><BriefcaseBusiness size={16}/> {p.headline||"Professional"}</p>{p.location&&<p><MapPin size={16}/> {p.location}</p>}{social(p.website)&&<a href={social(p.website)!} target="_blank" rel="noopener noreferrer"><Globe2 size={16}/> Visit website <ExternalLink size={13}/></a>}</div></section>
 <section className="tpl-section" id="skills"><div className="tpl-section-heading"><small>MY EXPERTISE</small><h2>Skills &amp; Technologies</h2></div><div className="tpl-split"><div><Skills skills={p.skills}/></div><div className="tpl-tech-grid">{[Code2,Layers3,Server,Database,TerminalSquare,Laptop2].map((Icon,i)=><div key={i}><Icon size={24}/><small>{["Web","Frontend","Backend","Database","Dev Tools","UI & UX"][i]}</small></div>)}</div></div></section>
 <section className="tpl-section" id="projects"><div className="tpl-section-heading"><small>FEATURED PROJECTS</small><h2>Some of my recent work</h2></div><Works projects={p.projects}/></section>
 <Journey education={p.education} experience={p.experience}/>
 <section className="tpl-contact" id="contact"><small>GET IN TOUCH</small><h2>Let&apos;s build something<br/> amazing together.</h2><p>Have a project in mind? Let&apos;s connect.</p>{social(p.website)&&<a href={social(p.website)!} target="_blank" rel="noopener noreferrer">VISIT MY WEBSITE <ArrowUpRight size={16}/></a>}</section><footer className="tpl-footer">© {new Date().getFullYear()} {p.name} <span>Made with Talentfolio AI</span></footer>
 </div>
}

function Neon({p}:{p:ThemeProps}){
 return <div className="tpl tpl-neon" id="top"><div className="tpl-neon-orb"/>
 <Header theme="neon" name={p.name} website={p.website}/>
 <section className="tpl-neon-hero"><div className="tpl-neon-copy">{p.openToOpportunities&&<span className="tpl-neon-badge"><span/> AVAILABLE FOR OPPORTUNITIES</span>}<h1>Hi, I&apos;m<br/><em>{p.name||"Your Name"}</em><span className="tpl-caret">|</span></h1><h2>{p.headline||"Full Stack Web Developer"}</h2><p>{p.bio||"I craft fast, modern and scalable experiences with clean code and great user interfaces."}</p><div className="tpl-actions"><a href="#projects" className="tpl-primary">View My Work <ArrowUpRight size={16}/></a><a href="#skills" className="tpl-outline">My Skills <ArrowDown size={16}/></a></div><div className="tpl-scroll"><ArrowDown size={18}/> SCROLL TO EXPLORE</div></div>
 <div className="tpl-neon-visual"><div className="tpl-neon-halo"/><Portrait avatar={p.avatar} name={p.name}/><div className="tpl-neon-laptop"><div className="tpl-neon-laptop-screen"><div className="tpl-code-bars">{Array.from({length:9},(_,i)=><span key={i} style={{width:`${35+(i*19)%60}%`}}/>)}</div><div className="tpl-code-symbol">⬡</div></div><div className="tpl-neon-keyboard"/></div><div className="tpl-neon-stats"><div><strong>{p.experience.length}+</strong><span>Career roles</span></div><div><strong>{p.projects.length}+</strong><span>Projects built</span></div><div><strong>{p.skills.length}+</strong><span>Skills listed</span></div></div></div></section>
 <section className="tpl-section" id="about"><div className="tpl-section-heading"><small>✦ ABOUT ME</small><h2>Building what&apos;s <em>next.</em></h2></div><p className="tpl-neon-about">{p.bio||"Exploring new ideas, building real projects and continuing to learn."}</p></section>
 <section className="tpl-section" id="skills"><div className="tpl-section-heading"><small>⬡ MY EXPERTISE</small><h2>Skills &amp; Technologies</h2></div><Skills skills={p.skills}/></section>
 <section className="tpl-section" id="projects"><div className="tpl-section-heading"><small>⬡ FEATURED WORK</small><h2>Selected Projects</h2></div><Works projects={p.projects}/></section>
 <Journey education={p.education} experience={p.experience}/>
 <section className="tpl-contact" id="contact"><div><small>LET&apos;S BUILD SOMETHING</small><h2>Amazing together <span>✳</span></h2><p>Gunakan pautan di bawah untuk menghubungi pemilik portfolio.</p></div>{social(p.website)&&<a href={social(p.website)!} target="_blank" rel="noopener noreferrer">Get in Touch <ArrowUpRight size={16}/></a>}</section>
 <footer className="tpl-footer">© {new Date().getFullYear()} {p.name}<span>Powered by Talentfolio AI</span></footer>
 </div>
}
function Crimson({p}:{p:ThemeProps}){
 const words=p.name.trim().split(/\s+/);const firstName=words[0]||"Your",lastName=words.slice(1).join(" ")||"Name";
 return <div className="tpl tpl-crimson" id="top">
 <header className="tpl-crimson-header"><span>DESIGN PORTFOLIO<br/>DIGITAL CREATOR</span>{p.openToOpportunities&&<span>AVAILABLE FOR OPPORTUNITIES <b>✳</b></span>}</header>
 <section className="tpl-crimson-hero"><div className="tpl-crimson-giant" aria-hidden="true">PORTFOLIO</div><div className="tpl-crimson-portrait"><Portrait name={p.name} avatar={p.avatar}/></div><div className="tpl-crimson-copy"><span className="tpl-crimson-hello">Hello, I&apos;m</span><h1>{firstName}<br/>{lastName}</h1><strong>{p.headline||"Creative Developer & Digital Designer"}</strong><p>{p.bio||"Creative digital experiences built with purpose, technical skill and attention to detail."}</p><a href="#projects" className="tpl-crimson-link">EXPLORE MY WORK <ArrowRight size={17}/></a></div><div className="tpl-crimson-side"><span>✳</span><p>Turning ideas into powerful digital experiences.</p><div><strong>{p.experience.length}+</strong><small>CAREER ROLES</small></div><div><strong>{p.projects.length}+</strong><small>PROJECTS BUILT</small></div></div></section>
 <section className="tpl-section" id="projects"><div className="tpl-crimson-divider"><h2>SELECTED PROJECTS</h2><span>EXPLORE PROJECTS <ArrowRight size={16}/></span></div><Works projects={p.projects}/></section>
 <section className="tpl-crimson-details tpl-section"><div id="skills"><h2>EDUCATION &amp; SKILLS</h2><h3>EXPERTISE</h3><Skills skills={p.skills}/></div><div id="about"><h2>ABOUT MY PROCESS</h2><div className="tpl-crimson-process">{[["DISCOVER","Understand the challenge"],["IDEATE","Explore creative possibilities"],["DESIGN","Plan clear experiences"],["DEVELOP","Build useful solutions"],["DELIVER","Improve with feedback"]].map(([n,d],i)=><div key={n}><span>{two(i+1)}</span><p><b>{n}</b><small>{d}</small></p></div>)}</div></div><div className="tpl-crimson-quote"><span>“</span><h3>Great work is not just how it looks, but how it works.</h3><strong>{p.name}</strong></div></section>
 <Journey education={p.education} experience={p.experience}/>
 <section className="tpl-crimson-contact" id="contact"><div><span>LET&apos;S WORK</span><h2>TOGETHER <b>✳</b></h2><p>{p.openToOpportunities?"Terbuka kepada peluang dan kolaborasi.":"Hubungi saya melalui pautan yang disediakan."}</p></div><div>{p.location&&<p><MapPin size={16}/> {p.location}</p>}{social(p.website)&&<a href={social(p.website)!} target="_blank" rel="noopener noreferrer"><Globe2 size={16}/> Visit my website <ArrowUpRight size={16}/></a>}</div></section>
 <footer className="tpl-footer">© {new Date().getFullYear()} {p.name}<span>Designed with Talentfolio AI</span></footer>
 </div>
}
export default function PortfolioThemes(props:ThemeProps){return props.theme==="amber"?<Amber p={props}/>:props.theme==="neon"?<Neon p={props}/>:<Crimson p={props}/>;}

````

## 5. `components/portfolio-expansion.tsx`

````tsx
import ProjectMedia from "@/components/project-media";
import {ProjectGallery} from "@/components/project-gallery-public";
import {ArrowRight,ArrowUpRight,Award,BookOpen,BriefcaseBusiness,Code2,GraduationCap,Laptop2,MapPin,Palette,PenTool,Quote,Smile,Sun,Terminal,UserRound,Zap} from "lucide-react";
import type {ThemeProps} from "@/components/portfolio-themes";
export type ExpansionTheme="sunny"|"student3d"|"noirluxe";
export type ExpansionProps=Omit<ThemeProps,"theme"> & {theme:ExpansionTheme;certCount?:number};
const safe=(s:string)=>{try{const u=new URL(s);return u.protocol==="https:"||u.protocol==="http:"?u.toString():null}catch{return null}};
function Photo({p}:{p:ExpansionProps}){return <div className="ex-photo">{p.avatar?<img src={p.avatar} alt={`Gambar profil ${p.name}`}/>:<div className="ex-placeholder"><UserRound size={95} strokeWidth={1.4}/></div>}</div>}
function Cards({p}:{p:ExpansionProps}){return <div className="ex-projects">{p.projects.length?p.projects.map((x,i)=><article key={i} className="ex-project"><div className="ex-project-cover"><ProjectMedia project={x}/>{false&&<><div className="ex-browser"><span/><span/><span/></div>{i%2?<Palette size={49}/>:<Laptop2 size={49}/>}<small>FEATURED / 0{i+1}</small></>}</div><div className="ex-project-body"><span>{String(i+1).padStart(2,"0")}</span><div><h3>{x.title}</h3><p>{x.description||"Portfolio project"}</p>{safe(x.url||"")&&<a href={safe(x.url||"")!} target="_blank" rel="noopener noreferrer">Explore project <ArrowUpRight size={14}/></a>}</div></div></article>):<div className="ex-empty">Projek pilihan akan dipaparkan di sini selepas anda menambah projek.</div>}</div>}
function Timeline({p}:{p:ExpansionProps}){if(!p.education.length&&!p.experience.length)return null;return <>
 {p.experience.length>0&&<section className="ex-section" id="experience"><div className="ex-section-label">PROFESSIONAL HISTORY</div><h2>Work Experience</h2><div className="ex-timeline">{p.experience.map((x,i)=><article key={`w${i}`}><BriefcaseBusiness size={20}/><div><small>{x.start||"—"} — {x.end||"Present"}</small><h3>{x.role}</h3><b>{x.company}</b><p>{x.description}</p></div></article>)}</div></section>}
 {p.education.length>0&&<section className="ex-section" id="education"><div className="ex-section-label">ACADEMIC JOURNEY</div><h2>Education &amp; Training</h2><div className="ex-timeline">{p.education.map((x,i)=><article key={`e${i}`}><GraduationCap size={20}/><div><small>{x.start||"—"} — {x.end||"Present"}</small><h3>{x.qualification}</h3><b>{x.institution}</b>{x.field&&<p>{x.field}</p>}<p>{x.description}</p></div></article>)}</div></section>}
 </>}

function Contact({p}:{p:ExpansionProps}){const link=safe(p.website);return <footer className="ex-footer" id="contact"><div><small>LET US CONNECT</small><h2>Build something<br/>amazing together.</h2>{p.location&&<p>{p.location}</p>}{link&&<a href={link} target="_blank" rel="noopener noreferrer">Visit My Website <ArrowUpRight size={16}/></a>}</div><div className="ex-footer-stamp">✳<span>{p.name||"Portfolio"}</span></div></footer>}
function Sunny({p}:{p:ExpansionProps}){return <main className="ex ex-sunny" id="top"><header className="ex-sunny-header"><span>DESIGNER<br/>&amp; CREATIVE</span><span className="ex-sunbar">☀</span><a href="#contact">LET&apos;S CREATE<br/>SOMETHING BRIGHT</a></header><section className="ex-sunny-hero"><div className="ex-sunny-title" aria-hidden="true">PORTFOLIO</div><div className="ex-sunny-sun" aria-hidden="true"/><div className="ex-sunny-photo"><Photo p={p}/><div className="ex-sunny-stamp">THINK<br/>☀<br/>BRIGHT</div></div><div className="ex-sunny-copy"><span>✳ HELLO, I&apos;M</span><h1>{p.name||"Your Name"}</h1><h2>{p.headline||"DESIGNING DIGITAL EXPERIENCES"}</h2><p>{p.bio||"Creating bold ideas and meaningful experiences."}</p><div className="ex-sunny-pills">{p.location&&<span><MapPin size={14}/>{p.location}</span>}{p.openToOpportunities&&<a href="#contact">AVAILABLE FOR COLLABORATION</a>}</div></div></section><div className="ex-sunny-stats">{[[p.experience.length,"CAREER ROLES"],[p.projects.length,"PROJECTS"],[p.skills.length,"SKILLS"],[p.education.length,"EDUCATION"]].map(([n,label])=><div key={label}><strong>{n}+</strong><small>{label}</small></div>)}</div><section className="ex-sunny-works ex-section" id="projects"><div className="ex-sunny-sectionhead"><h2>☀ SELECTED WORKS</h2><a href="#skills">EXPLORE THE PROJECTS <ArrowRight size={16}/></a></div><Cards p={p}/></section><section className="ex-sunny-lower"><div id="skills"><h2>✳ CREATIVE TOOLKIT</h2><div className="ex-sunny-tools">{p.skills.length?p.skills.map((s,i)=><span key={i}><Palette size={21}/>{s.name}</span>):<p>Add your skills to populate this section.</p>}</div></div><div><h2>✳ MY DESIGN PROCESS</h2><div className="ex-sunny-steps">{["DISCOVER","DEFINE","DESIGN","DEVELOP","DELIVER"].map((v,i)=><span key={v}><b>{String(i+1).padStart(2,"0")}</b>{v}</span>)}</div></div></section><Timeline p={p}/><Contact p={p}/></main>}
function Student({p}:{p:ExpansionProps}){return <main className="ex ex-student" id="top"><section className="ex-student-hero"><div className="ex-student-copy"><div className="ex-student-tag">✦ STUDENT / CREATIVE PORTFOLIO</div><h1>Hi, I&apos;m<br/><em>{p.name||"Your Name"}</em></h1><h2>{p.headline||"Aspiring Digital Creator & Developer"}</h2><p>{p.bio||"Building creative and responsive experiences to solve real-world challenges."}</p><div className="ex-actions"><a href="#projects">Explore My Work <ArrowUpRight size={16}/></a><a href="#contact">Contact Me <ArrowRight size={16}/></a></div><div className="ex-student-social">✧ KEEP EXPLORING · KEEP GROWING</div></div><div className="ex-student-visual"><div className="ex-student-orb"/><div className="ex-student-photo"><Photo p={p}/></div><div className="ex-student-floating floating-one"><Code2 size={27}/></div><div className="ex-student-floating floating-two"><Terminal size={24}/></div><div className="ex-student-laptop"><Laptop2 size={120}/></div></div></section><section className="ex-student-about ex-section" id="about"><div className="ex-student-avatar"><Photo p={p}/></div><div><small>ABOUT ME</small><h2>Get to know me!</h2><p>{p.bio||"Every day is an opportunity to learn, experiment and grow."}</p>{p.location&&<p><MapPin size={14}/>{p.location}</p>}</div><div className="ex-student-stats">{[[p.projects.length,"Projects",BriefcaseBusiness],[p.experience.length,"Career Roles",GraduationCap],[p.certCount||0,"Certificates",Award],[p.skills.length,"Technologies",Code2]].map(([num,label,Icon],i)=>{const I=Icon as typeof Award;return <div key={String(label)} className={`ex-student-stat stat-${i}`}><strong>{Number(num)}+</strong><span>{String(label)}</span><I size={27}/></div>})}</div></section><section className="ex-section ex-student-skills" id="skills"><small>MY SKILLS</small><h2>Technologies I Work With</h2><div className="ex-student-chips">{p.skills.length?p.skills.map((s,i)=><span key={i}><Zap size={18}/>{s.name}</span>):<p>Add skills to your profile.</p>}</div></section><section className="ex-section" id="projects"><small>FEATURED PROJECTS</small><h2>Some of My Recent Work</h2><Cards p={p}/></section><Timeline p={p}/><section className="ex-student-note"><div><BookOpen size={21}/><h3>Learning is a journey.</h3><p>Every achievement begins with curiosity.</p></div></section><Contact p={p}/></main>}
function Luxe({p}:{p:ExpansionProps}){return <main className="ex ex-luxe" id="top"><div className="ex-luxe-top"><span>CREATIVE PORTFOLIO</span>{p.openToOpportunities&&<span>AVAILABLE FOR COLLABORATION ✳</span>}</div><section className="ex-luxe-hero"><div className="ex-luxe-title" aria-hidden="true">PORTFOLIO</div><div className="ex-luxe-portrait"><Photo p={p}/></div><div className="ex-luxe-side left"><h2>UI / UX / WEB</h2><p>USER EXPERIENCE<br/>INTERFACE DESIGN<br/>DIGITAL CREATION</p><blockquote>“Designing intuitive, beautiful &amp; impactful experiences.”</blockquote></div><div className="ex-luxe-side right"><h1>{p.name||"Your Name"}</h1><strong>{p.headline||"CREATIVE DIGITAL PROFESSIONAL"}</strong><p>{p.bio||"A creative professional blending functional design and purposeful digital experiences."}</p><div className="ex-luxe-numbers"><div><b>{p.experience.length}+</b><small>ROLES</small></div><div><b>{p.projects.length}+</b><small>PROJECTS</small></div><div><b>{p.skills.length}+</b><small>SKILLS</small></div></div></div></section><section className="ex-luxe-services ex-section" id="skills"><h2>WHAT I DO</h2><div className="ex-luxe-cards">{(p.skills.length?p.skills.slice(0,5).map(s=>s.name):["Design","Develop","Create"]).map((s,i)=><div key={i}><span>✳</span><b>{s}</b><p>Professional skill and expertise</p></div>)}</div></section><section className="ex-luxe-double ex-section"><div><h2>MY PROCESS</h2>{["DISCOVER","DEFINE","DESIGN","DEVELOP","DELIVER"].map((s,i)=><div className="ex-luxe-step" key={s}><b>{String(i+1).padStart(2,"0")}</b><span>{s}</span></div>)}</div><div id="projects"><h2>FEATURED WORK</h2><Cards p={p}/></div></section><section className="ex-luxe-about ex-section" id="about"><div><h2>ABOUT ME</h2><p>{p.bio||"Driven by design, clarity and an enduring curiosity."}</p></div><div><h2>MY TOOLKIT</h2><div className="ex-luxe-tags">{p.skills.map((s,i)=><span key={i}>{s.name}</span>)}</div></div></section><Timeline p={p}/><Contact p={p}/></main>}
export default function ExpansionThemes(props:ExpansionProps){return props.theme==="sunny"?<Sunny p={props}/>:props.theme==="student3d"?<Student p={props}/>:<Luxe p={props}/>;}

````

## 6. `app/u/[slug]/opengraph-image.tsx`

````tsx
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

````

## 7. `app/robots.ts`

````ts
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

````

## 8. `app/sitemap.ts`

````ts
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

````

