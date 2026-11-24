import ProjectMedia from "@/components/project-media";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowDownRight,ArrowUpRight, BriefcaseBusiness, Code2, ExternalLink, Globe2, GraduationCap, MapPin, Sparkles, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import {ProjectGallery,type PublishedImage} from "@/components/project-gallery-public";
import PortfolioThemes, {type NewTheme} from "@/components/portfolio-themes";
import ExpansionThemes,{type ExpansionTheme} from "@/components/portfolio-expansion";
export const dynamic="force-dynamic";

type Snap={
 name?:string;headline?:string;bio?:string;location?:string;website?:string;avatar?:string;
 skills?:{name:string}[];
 projects?:{title:string;description:string;url:string;images?:PublishedImage[]}[];
 education?:{institution:string;qualification:string;field:string;start:number|null;end:number|null;description:string}[];
 experience?:{company:string;role:string;start:string|null;end:string|null;description:string}[];
};
type Portfolio={slug:string;template:string;snapshot:Snap};
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
 const {data,error}=await db.from("portfolio_publications").select("slug,template,snapshot").eq("slug",slug).eq("published",true).maybeSingle();
 if(error||!data)notFound();
 return {slug:data.slug,template:data.template,snapshot:data.snapshot as Snap||{}};
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
 const safeProjects=projects.map(p=>({...p,images:(Array.isArray(p.images)?p.images:[]).filter(im=>{try{const u=new URL(im.url);return u.href.startsWith(imageBase)&&u.protocol==="https:"}catch{return false}}).slice(0,12)}));
 if(["sunny","student3d","noirluxe"].includes(portfolio.template)){
  return <ExpansionThemes theme={portfolio.template as ExpansionTheme} name={name} headline={s.headline||""}
   bio={s.bio||""} location={s.location||""} avatar={avatar||""} website={website||""}
   skills={skills.map(x=>({name:x.name}))}
   projects={safeProjects.map(x=>({title:x.title,description:x.description,url:x.url,images:x.images}))}
   education={educations.map(x=>({institution:x.institution,qualification:x.qualification,field:x.field,start:x.start,end:x.end,description:x.description}))}
   experience={experiences.map(x=>({company:x.company,role:x.role,start:x.start,end:x.end,description:x.description}))}/>;
 }
 if(["amber","neon","crimson"].includes(portfolio.template)){
   return <PortfolioThemes theme={portfolio.template as NewTheme}
    name={name} headline={s.headline||""} bio={s.bio||""} location={s.location||""}
    avatar={avatar||""} website={website||""}
    skills={skills.map(x=>({name:x.name}))}
    projects={safeProjects.map(p=>({title:p.title,description:p.description,url:p.url,images:p.images}))}
    education={educations.map(x=>({institution:x.institution,qualification:x.qualification,field:x.field,start:x.start,end:x.end,description:x.description}))}
    experience={experiences.map(x=>({company:x.company,role:x.role,start:x.start,end:x.end,description:x.description}))}/>;
 }
 const classes=["modern","minimal","tech"].includes(portfolio.template)?portfolio.template:"modern";
 return <div className={`tf-public-v2 tf-public-v2-${classes}`}>
  <header className="tf-public-v2-nav"><div className="tf-public-v2-navinner"><a href="#home" className="tf-public-v2-logo">{name}<span>✳</span></a><nav aria-label="Portfolio navigation"><a href="#about">About</a><a href="#work">Work</a><a href="#expertise">Expertise</a>{experiences.length+educations.length>0&&<a href="#experience">Experience</a><a href="#education">Education</a>}</nav><a className="tf-public-v2-contact" href="#contact">Let&apos;s connect <ArrowUpRight size={16}/></a></div></header>
  <main id="home"><section className="tf-public-v2-hero"><div className="tf-public-v2-heromain"><div className="tf-public-v2-intro"><span className="tf-public-v2-kicker"><span className="tf-public-v2-status"/> HELLO, WELCOME TO MY WORLD</span>
    <h1>Hi, I&apos;m <em>{first}.</em><br/><span>Making ideas</span><br/><i>come alive.</i></h1><p className="tf-public-v2-role">{s.headline||"Professional Portfolio & Creative Journey"}</p><p className="tf-public-v2-description">{s.bio||"A journey of creativity, learning and building meaningful work."}</p>
    <div className="tf-public-v2-actions"><a className="tf-public-v2-primary" href="#work">Explore My Work <ArrowUpRight size={18}/></a><a className="tf-public-v2-secondary" href="#about">More About Me <ArrowDownRight size={18}/></a></div>
    <div className="tf-public-v2-location"><MapPin size={16}/>{s.location||"Malaysia"}<span>·</span> Open to opportunities</div>
  </div><div className="tf-public-v2-art"><div className="tf-public-v2-ring r1"/><div className="tf-public-v2-ring r2"/><div className="tf-public-v2-portrait">{avatar?<img src={avatar} alt={`Portrait of ${name}`}/>:<UserRound size={115}/>}</div><div className="tf-public-v2-floating"><Sparkles size={16}/> Always evolving</div><span className="tf-public-v2-art-star">✳</span></div></div>
  <div className="tf-public-v2-stats"><div><strong>{String(projects.length).padStart(2,"0")}</strong><span>Projects</span></div><div><strong>{String(skills.length).padStart(2,"0")}</strong><span>Skills & strengths</span></div><div><strong>{String(educations.length+experiences.length).padStart(2,"0")}</strong><span>Career milestones</span></div><div><strong>∞</strong><span>Possibilities ahead</span></div></div></section>
  <section className="tf-public-v2-about tf-public-v2-section" id="about"><div className="tf-public-v2-label">01 / THE PERSON BEHIND THE WORK</div><div className="tf-public-v2-aboutgrid"><h2>A little about <em>my story.</em></h2><div><p>{s.bio||"Driven by curiosity, growth and a passion for solving real problems."}</p><span className="tf-public-v2-smallnote">Every project is another chapter of learning and creating with purpose.</span></div></div></section>
  <section className="tf-public-v2-section tf-public-v2-work" id="work"><div className="tf-public-v2-label">02 / WHAT I&apos;VE BEEN BUILDING</div><div className="tf-public-v2-titleline"><h2>Selected <em>work.</em></h2><span>PROJECT SHOWCASE <ArrowUpRight size={17}/></span></div>
   {projects.length?<div className="tf-public-v2-projectgrid">{safeProjects.map((p,i)=><article className="tf-public-v2-project" key={i}><div className="tf-public-v2-project-art"><ProjectMedia project={p}/>{false&&<><div className="tf-public-v2-project-articon"><Code2 size={35}/></div><span>PROJECT / {String(i+1).padStart(2,"0")}</span></>}</div><div className="tf-public-v2-project-details"><span>FEATURED PROJECT · {String(i+1).padStart(2,"0")}</span><h3>{p.title}</h3><p>{p.description||"Explore this project and the journey behind it."}</p>{p.url&&validWebsite(p.url)?<a href={validWebsite(p.url)!} rel="noopener noreferrer" target="_blank">Visit Project <ExternalLink size={15}/></a>:<span className="tf-public-v2-no-link">Project showcase</span>}</div></article>)}</div>:<div className="tf-public-v2-empty">Featured projects are coming soon.</div>}
  </section>
  <section className="tf-public-v2-expertise tf-public-v2-section" id="expertise"><div className="tf-public-v2-label">03 / WHAT I BRING TO THE TABLE</div><div className="tf-public-v2-titleline"><h2>My <em>expertise.</em></h2><span><Globe2 size={17}/> ALWAYS LEARNING</span></div>
   <div className="tf-public-v2-skillgrid">{skills.length?skills.map((x,i)=><div key={i} className="tf-public-v2-skill"><span>{String(i+1).padStart(2,"0")}</span><b>{x.name}</b><ArrowUpRight size={16}/></div>):<div className="tf-public-v2-empty">Skill highlights will appear here.</div>}</div>
  </section>
  {experiences.length>0&&<section className="tf-public-v2-section tf-public-v2-journey" id="experience"><div className="tf-public-v2-label">04 / PROFESSIONAL HISTORY</div><h2>Work <em>experience.</em></h2><div className="tf-public-v2-history">{experiences.map((x,i)=><article key={`work-${i}`}><div className="tf-public-v2-history-icon"><BriefcaseBusiness size={20}/></div><div><span>{x.start||"—"} — {x.end||"Present"}</span><h3>{x.role}</h3><b>{x.company}</b><p>{x.description}</p></div></article>)}</div></section>}
  {educations.length>0&&<section className="tf-public-v2-section tf-public-v2-journey" id="education"><div className="tf-public-v2-label">05 / EDUCATIONAL JOURNEY</div><h2>Education &amp; <em>training.</em></h2><div className="tf-public-v2-history">{educations.map((x,i)=><article key={`edu-${i}`}><div className="tf-public-v2-history-icon"><GraduationCap size={20}/></div><div><span>{x.start||"—"} — {x.end||"Present"}</span><h3>{x.qualification}</h3><b>{x.institution}{x.field?" · "+x.field:""}</b><p>{x.description}</p></div></article>)}</div></section>}
  <section className="tf-public-v2-cta" id="contact"><div className="tf-public-v2-label">LET&apos;S CREATE SOMETHING MEANINGFUL</div><h2>Have something<br/><em>in mind?</em></h2><p>I&apos;m always open to an interesting conversation and meaningful opportunities.</p>{website?<a href={website} target="_blank" rel="noopener noreferrer">Let&apos;s Connect <ArrowUpRight size={20}/></a>:<span className="tf-public-v2-cta-small">Connect via my professional network.</span>}</section>
  </main><footer className="tf-public-v2-footer"><span>© 2026 {name}. All rights reserved.</span><Link href="/">Built with Talentfolio AI ✳</Link><a href="#home">Back to top ↑</a></footer>
 </div>;
}
