import ProjectMedia from "@/components/project-media";
import Link from "next/link";
import {
  ArrowDownRight, ArrowUpRight, BriefcaseBusiness, Code2,
  Globe2, GraduationCap, MapPin, Sparkles, UserRound,
} from "lucide-react";
import { ProjectGallery, type PublishedImage } from "@/components/project-gallery-public";

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
