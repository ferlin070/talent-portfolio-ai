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
