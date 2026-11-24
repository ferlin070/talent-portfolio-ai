"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {ArrowLeft,BriefcaseBusiness,ExternalLink,FileDown,GraduationCap,Image as ImageIcon,Mail,MapPin,Printer,UserRound} from "lucide-react";
import {getSupabaseClient} from "@/lib/supabase";
type Profile={display_name:string;headline:string;bio:string;location:string;website:string;avatar_url:string};
type Project={id:string;title:string;description:string;url:string|null};
type Skill={id:string;name:string;self_rating:number|null};
type Edu={id:string;institution:string;qualification:string;field_of_study:string;start_year:number|null;end_year:number|null;description:string};
type Work={id:string;company:string;role:string;start_date:string|null;end_date:string|null;description:string};
type Picture={project_id:string;storage_path:string;is_cover:boolean;sort_order:number};
type Template="executive"|"modern"|"creative";
const empty={display_name:"",headline:"",bio:"",location:"",website:"",avatar_url:""};
function formatDate(s:string|null){if(!s)return "Kini";return /^\d{4}-/.test(s)?new Date(s+"T00:00:00").toLocaleDateString("ms-MY",{month:"short",year:"numeric"}):s}
function safeUrl(v?:string|null){try{const u=new URL(v||"");return ["http:","https:"].includes(u.protocol)?u.toString():null}catch{return null}}
export default function Resume(){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [busy,setBusy]=useState(true),[error,setError]=useState(""),[signedIn,setSignedIn]=useState(false),[email,setEmail]=useState("");
 const [profile,setProfile]=useState<Profile>(empty),[skills,setSkills]=useState<Skill[]>([]),[projects,setProjects]=useState<Project[]>([]),[education,setEducation]=useState<Edu[]>([]),[work,setWork]=useState<Work[]>([]),[pictures,setPictures]=useState<Picture[]>([]);
 const [template,setTemplate]=useState<Template>("executive"),[showProjects,setShowProjects]=useState(true),[showPortrait,setShowPortrait]=useState(true);
 useEffect(()=>{let mounted=true;(async()=>{try{
  const {data:{user},error:authError}=await db.auth.getUser();if(authError)throw authError;if(!user)return;
  if(mounted){setSignedIn(true);setEmail(user.email||"");}
  const [p,s,pr,e,w,im]=await Promise.all([
   db.from("profiles").select("display_name,headline,bio,location,website,avatar_url").eq("user_id",user.id).maybeSingle(),
   db.from("skills").select("id,name,self_rating").eq("user_id",user.id).order("created_at",{ascending:false}),
   db.from("projects").select("id,title,description,url").eq("user_id",user.id).order("created_at",{ascending:false}),
   db.from("education").select("id,institution,qualification,field_of_study,start_year,end_year,description").eq("user_id",user.id).order("start_year",{ascending:false}),
   db.from("work_experience").select("id,company,role,start_date,end_date,description").eq("user_id",user.id).order("start_date",{ascending:false}),
   db.from("project_images").select("project_id,storage_path,is_cover,sort_order").eq("user_id",user.id).order("sort_order",{ascending:true})
  ]);
  const err=[p.error,s.error,pr.error,e.error,w.error,im.error].find(Boolean);if(err)throw err;
  if(!mounted)return;
  setProfile({...empty,...p.data} as Profile);setSkills((s.data||[]) as Skill[]);setProjects((pr.data||[]) as Project[]);setEducation((e.data||[]) as Edu[]);setWork((w.data||[]) as Work[]);setPictures((im.data||[]) as Picture[]);
 }catch(e){if(mounted)setError(e instanceof Error?e.message:"Tidak dapat memuatkan CV.");}finally{if(mounted)setBusy(false)}})();return()=>{mounted=false}},[db]);
 function cover(id:string){const matching=pictures.filter(x=>x.project_id===id).sort((a,b)=>Number(b.is_cover)-Number(a.is_cover)||a.sort_order-b.sort_order);return matching.length?db.storage.from("project-gallery").getPublicUrl(matching[0].storage_path).data.publicUrl:null}
 return <div className="tf-resume-v2"><div className="tf-resume-controls"><Link href="/dashboard" className="tf-btn tf-btn-outline"><ArrowLeft size={15}/> Dashboard</Link><div><strong>Resume Studio</strong><span>3 professional designs</span></div><button className="tf-btn" onClick={()=>window.print()} disabled={!signedIn||busy}><Printer size={16}/> Print / Save as PDF</button></div>
 {busy?<div className="tf-resume-message">Memuatkan profil dan pengalaman...</div>:error?<div role="alert" className="tf-resume-message">{error}</div>:!signedIn?<div className="tf-resume-message">Log masuk diperlukan. <Link href="/auth" className="tf-link">Log masuk</Link></div>:<>
 <section className="tf-resume-toolbar-v2"><div><h2>Pilih reka bentuk CV</h2><p>Data kekal sama. Pilih template dan gunakan Print / Save as PDF.</p></div><div className="tf-resume-choices">{([["executive","Executive","Corporate / ATS"],["modern","Modern","Clean & Navy"],["creative","Creative","Premium Editorial"]] as const).map(([id,title,sub])=><button key={id} className={template===id?"selected":""} aria-pressed={template===id} onClick={()=>setTemplate(id)}><b>{title}</b><span>{sub}</span></button>)}</div><div className="tf-resume-options"><label><input type="checkbox" checked={showPortrait} onChange={e=>setShowPortrait(e.target.checked)}/> Gambar profil</label><label><input type="checkbox" checked={showProjects} onChange={e=>setShowProjects(e.target.checked)}/> Gambar projek (pilihan)</label></div></section>
 <div className="tf-resume-hint"><FileDown size={16}/> Tip: di dialog Print, pilih A4, Margin: Default/None dan aktifkan Background Graphics untuk tema Creative.</div>
 <article className={`tf-resume-document tf-resume-${template}`}>
  <header className="tf-cv-header"><div className="tf-cv-id"><span>PROFESSIONAL RESUME</span><h1>{profile.display_name||"Nama Anda"}</h1><h2>{profile.headline||"Professional / Graduate"}</h2></div>{showPortrait&&<div className="tf-cv-portrait">{profile.avatar_url?<img src={profile.avatar_url} alt={`Gambar profil ${profile.display_name}`}/>:<UserRound size={50}/>}</div>}</header>
  <div className="tf-cv-contacts">{email&&<span><Mail size={13}/>{email}</span>}{profile.location&&<span><MapPin size={13}/>{profile.location}</span>}{safeUrl(profile.website)&&<a href={safeUrl(profile.website)!} target="_blank" rel="noopener noreferrer"><ExternalLink size={13}/>{profile.website}</a>}</div>
  {profile.bio&&<section className="tf-cv-section"><h3>PROFESSIONAL SUMMARY</h3><p className="tf-cv-summary">{profile.bio}</p></section>}
  {work.length>0&&<section className="tf-cv-section"><h3>WORK EXPERIENCE</h3>{work.map(x=><div className="tf-cv-entry" key={x.id}><div className="tf-cv-entry-top"><div><h4>{x.role}</h4><b>{x.company}</b></div><span>{formatDate(x.start_date)} – {formatDate(x.end_date)}</span></div>{x.description&&<p>{x.description}</p>}</div>)}</section>}
  {education.length>0&&<section className="tf-cv-section"><h3>EDUCATION & TRAINING</h3>{education.map(x=><div className="tf-cv-entry" key={x.id}><div className="tf-cv-entry-top"><div><h4>{x.qualification}</h4><b>{x.institution}{x.field_of_study?" · "+x.field_of_study:""}</b></div><span>{x.start_year||"—"} – {x.end_year||"Kini"}</span></div>{x.description&&<p>{x.description}</p>}</div>)}</section>}
  {skills.length>0&&<section className="tf-cv-section"><h3>CORE SKILLS</h3><div className="tf-cv-skills">{skills.map(s=><span key={s.id}>{s.name}</span>)}</div><small>Kemahiran berdasarkan penilaian kendiri.</small></section>}
  {projects.length>0&&<section className="tf-cv-section"><h3>SELECTED PROJECTS</h3>{projects.map(x=><div className="tf-cv-project" key={x.id}>{showProjects&&cover(x.id)&&<img className="tf-cv-project-img" src={cover(x.id)!} alt={"Gambar projek "+x.title}/>}<div><h4>{x.title}</h4>{x.description&&<p>{x.description}</p>}{safeUrl(x.url)&&<a href={safeUrl(x.url)!} target="_blank" rel="noopener noreferrer">{x.url}</a>}</div></div>)}</section>}
  <footer className="tf-cv-footer">Generated with Talentfolio AI · Sila semak maklumat sebelum berkongsi.</footer>
 </article>
 </>}</div>
}
