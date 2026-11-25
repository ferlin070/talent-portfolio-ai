# Talentfolio AI — Fasa 2: Kod Penuh, Bahagian C

Branch: `feature/phase2-publishing-ux`. Komponen dashboard, portfolio publishing, penambahbaikan UX dan sambungan Gemini.

## 1. `components/workspace.tsx`

````tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SupportPartners from "@/components/support-partners";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe2, FolderKanban, Award, ChartNoAxesCombined, FileUser, GraduationCap, BriefcaseBusiness, UserRound, Sparkles, Menu, X, Plus, LogOut, ExternalLink, UploadCloud, Trash2, Download, CheckCircle2, BookOpen, ArrowRight, ShieldCheck, Settings, Search, Target, RefreshCw, Moon, Sun, WandSparkles } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import HistoryEditor from "@/components/history-editor";
import ProfilePhotoEditor from "@/components/profile-photo-editor";
import PublicPortfolioClassic from "@/components/public-portfolio-classic";
import PortfolioThemes, { type NewTheme } from "@/components/portfolio-themes";
import ExpansionThemes,{type ExpansionTheme} from "@/components/portfolio-expansion";
import ProjectGalleryEditor,{type GalleryImage} from "@/components/project-gallery-editor";
import SkillEditor from "@/components/skill-editor";
import AIAnalysis from "@/components/ai-skills-analysis";
import PromptGenerator from "@/components/prompt-generator";
import ConfirmDialog from "@/components/confirm-dialog";
import {CAREER_TARGETS, measureCareerTarget} from "@/lib/career-targets";
import {PUBLIC_SECTIONS, DEFAULT_PUBLIC_SECTIONS, normalizeSections, buildDraftSnapshot, visualFingerprint, snapshotFingerprint, validPortfolioSlug, type PortfolioSections} from "@/lib/portfolio-publishing";

type Profile = { display_name:string; user_type:"student"|"worker"; headline:string; bio:string; website:string; location:string; avatar_url:string; is_public:boolean };
type Project = { id:string; title:string; description:string; url:string|null; is_public:boolean; created_at:string };
type Certificate = {id:string;name:string;issuer:string|null;issued_on:string|null;expires_on:string|null;storage_path:string|null;verification_status:string;created_at:string};
type Skill = {id:string;name:string;self_rating:number|null;created_at:string};
type Education={id:string;institution:string;qualification:string;field_of_study:string;start_year:number|null;end_year:number|null;description:string;created_at:string};
type Work={id:string;company:string;role:string;start_date:string|null;end_date:string;description:string;created_at:string};
type PortfolioTheme = "modern"|"minimal"|"tech"|"amber"|"neon"|"crimson"|"sunny"|"student3d"|"noirluxe";
type Publication = {slug:string;template:PortfolioTheme;published:boolean;updated_at:string;sections:PortfolioSections;noindex:boolean;open_to_opportunities:boolean;snapshot:unknown};
const empty:Profile={display_name:"",user_type:"student",headline:"",bio:"",website:"",location:"",avatar_url:"",is_public:false};
const paths=[["/dashboard","Dashboard",LayoutDashboard],["/portfolio","Portfolio Builder",Globe2],["/projects","Projects",FolderKanban],["/education","Education",GraduationCap],["/experience","Work Experience",BriefcaseBusiness],["/resume","Resume Builder",FileUser],["/certificates","Certificate Vault",Award],["/skills","Skills Analysis",ChartNoAxesCombined],["/profile","My Profile",UserRound],["/settings","Settings",Settings],["/prompt-generator","Prompt Generator",WandSparkles]] as const;
const nameSlug=(s:string)=>s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);
const onlyHttp=(v:string)=>{try{const u=new URL(v);return ["https:","http:"].includes(u.protocol)?u.toString():null}catch{return null}};
const errText=(e:unknown)=>e instanceof Error?e.message:"Ralat tidak dijangka. Cuba lagi.";
const dateText=(s?:string|null)=>s?new Date(s).toLocaleDateString("ms-MY",{year:"numeric",month:"short",day:"numeric"}):"Tiada tarikh";
export default function Workspace(){
 const pathname=usePathname(), section=pathname==="/education"?"education":pathname==="/experience"?"experience":pathname==="/certificates"?"certificates":pathname==="/skills"?"skills":pathname==="/portfolio"?"portfolio":pathname==="/prompt-generator"?"prompt":pathname==="/projects"?"projects":pathname==="/profile"?"profile":"dashboard";
 const client=useMemo(()=>getSupabaseClient(),[]);
 const [userId,setUserId]=useState<string|null>(null),[email,setEmail]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[mobile,setMobile]=useState(false),[notice,setNotice]=useState("");
 const [profile,setProfile]=useState<Profile>(empty),[projects,setProjects]=useState<Project[]>([]),[certs,setCerts]=useState<Certificate[]>([]),[skills,setSkills]=useState<Skill[]>([]),[education,setEducation]=useState<Education[]>([]),[workHistory,setWorkHistory]=useState<Work[]>([]),[publication,setPublication]=useState<Publication|null>(null),[projectImages,setProjectImages]=useState<GalleryImage[]>([]);
 const [dashboardTheme,setDashboardTheme]=useState<"default"|"neumorph">("default");
 const [dark,setDark]=useState(false);
 useEffect(()=>{const pref=localStorage.getItem("tf-dark")==="true";setDark(pref);document.documentElement.classList.toggle("tf-dark",pref);},[]);
 function toggleDark(){setDark(prev=>{const next=!prev;document.documentElement.classList.toggle("tf-dark",next);localStorage.setItem("tf-dark",String(next));return next;});}
 const [theme,setTheme]=useState<PortfolioTheme>("modern"),[slug,setSlug]=useState(""),[role,setRole]=useState("fullstack"),[filter,setFilter]=useState("all"),[q,setQ]=useState("");
 const [certForm,setCertForm]=useState({name:"",issuer:"",issued_on:""}),[certFile,setCertFile]=useState<File|null>(null);
 const [projectForm,setProjectForm]=useState({title:"",description:"",url:"",is_public:true});
 const [publicSections,setPublicSections]=useState<PortfolioSections>(DEFAULT_PUBLIC_SECTIONS);
 const [noindex,setNoindex]=useState(false);
 const [openToOpportunities,setOpenToOpportunities]=useState(false);
 const [publishConfirmation,setPublishConfirmation]=useState<"publish"|"unpublish"|null>(null);
 const [deleteConfirmation,setDeleteConfirmation]=useState<null|{
  kind:"project"|"certificate";id:string;title:string;
 }>(null);
 const [undoProject,setUndoProject]=useState<Project|null>(null);
 useEffect(()=>{
  if(!undoProject)return;
  const timer=window.setTimeout(()=>setUndoProject(null),6000);
  return()=>window.clearTimeout(timer);
 },[undoProject]);


 const refresh=useCallback(async (uid:string)=>{
   const [p,j,c,s,pub,ed,w,gallery]=await Promise.all([
    client.from("profiles").select("display_name,user_type,headline,bio,website,location,avatar_url,is_public").eq("user_id",uid).maybeSingle(),
    client.from("projects").select("id,title,description,url,is_public,created_at").eq("user_id",uid).order("created_at",{ascending:false}),
    client.from("certificates").select("id,name,issuer,issued_on,expires_on,storage_path,verification_status,created_at").eq("user_id",uid).order("created_at",{ascending:false}),
    client.from("skills").select("id,name,self_rating,created_at").eq("user_id",uid).order("created_at",{ascending:false}),
    client.from("portfolio_publications").select("slug,template,published,updated_at,sections,noindex,open_to_opportunities,snapshot").eq("user_id",uid).maybeSingle(),
    client.from("education").select("id,institution,qualification,field_of_study,start_year,end_year,description,created_at").eq("user_id",uid).order("created_at",{ascending:false}),
    client.from("work_experience").select("id,company,role,start_date,end_date,description,created_at").eq("user_id",uid).order("created_at",{ascending:false}),
    client.from("project_images").select("id,project_id,user_id,storage_path,caption,sort_order,is_cover,created_at").eq("user_id",uid).order("sort_order",{ascending:true})
   ]);
   const errors=[p.error,j.error,c.error,s.error,pub.error,ed.error,w.error,gallery.error].filter(Boolean);if(errors.length)throw new Error(errors[0]?.message);
   setProfile({...empty,...p.data} as Profile);setProjects((j.data||[]) as Project[]);setCerts((c.data||[]) as Certificate[]);setSkills((s.data||[]) as Skill[]);setEducation((ed.data||[]) as Education[]);setWorkHistory((w.data||[]) as Work[]);setProjectImages((gallery.data||[]) as GalleryImage[]);
   setPublication(pub.data as Publication|null);
   setPublicSections(normalizeSections(pub.data?.sections));
   setNoindex(pub.data?.noindex===true);
   setOpenToOpportunities(pub.data?.open_to_opportunities===true);
   setTheme((pub.data?.template||"modern") as PortfolioTheme);setSlug(pub.data?.slug||nameSlug(p.data?.display_name||""));
 },[client]);
 useEffect(()=>{let active=true;(async()=>{try{const {data,error}=await client.auth.getUser();if(error)throw error;if(!active)return;
  if(data.user){setUserId(data.user.id);setEmail(data.user.email||"");await refresh(data.user.id);const {data:settings,error:settingsError}=await client.from("dashboard_preferences").select("theme").eq("user_id",data.user.id).maybeSingle();if(settingsError)throw settingsError;if(active)setDashboardTheme(settings?.theme==="neumorph"?"neumorph":"default");}
 }catch(e){if(active)setNotice(errText(e));}finally{if(active)setLoading(false)}})();return()=>{active=false};},[client,refresh]);
 async function run(action:()=>Promise<void>){setBusy(true);setNotice("");try{await action();if(userId)await refresh(userId)}catch(e){setNotice(errText(e))}finally{setBusy(false)}}
 const completenessFactors=[
  !!profile.display_name,!!profile.headline,!!profile.bio,
  !!profile.avatar_url,!!profile.website,projects.length>0,
  skills.length>0,certs.length>0,education.length>0,workHistory.length>0
 ];
 const completion=completenessFactors.filter(Boolean).length/completenessFactors.length*100;
 const desired=CAREER_TARGETS.find(item=>item.id===role)||CAREER_TARGETS[0];
 const gaps=measureCareerTarget(desired,skills).sort((a,b)=>b.gap-a.gap);
 const pageTitle={dashboard:"Dashboard",portfolio:"Portfolio Builder",projects:"My Projects",education:"Education",experience:"Work Experience",certificates:"Certificate Vault",skills:"Skills Intelligence",profile:"My Profile",prompt:"Prompt Generator"}[section];
 const username=profile.display_name||email?.split("@")[0]||"Pengguna";
 const galleryProjects=projects.map(p=>({...p,images:projectImages.filter(im=>im.project_id===p.id).sort((a,b)=>a.sort_order-b.sort_order).map(im=>({url:client.storage.from("project-gallery").getPublicUrl(im.storage_path).data.publicUrl,caption:im.caption,is_cover:im.is_cover}))}));
 const draftSnapshot=buildDraftSnapshot({
  profile,sections:publicSections,skills,projects,
  projectImages,education,experience:workHistory,openToOpportunities
 });
 const draftHash=visualFingerprint({
  slug:slug.toLowerCase().trim(),template:theme,
  noindex,sections:publicSections,
  snapshot:snapshotFingerprint(draftSnapshot)
 });
 const publishedHash=publication?visualFingerprint({
  slug:publication.slug,template:publication.template,
  noindex:publication.noindex,sections:normalizeSections(publication.sections),
  snapshot:snapshotFingerprint(publication.snapshot)
 }):null;
 const hasUnpublishedChanges=!!publication?.published&&draftHash!==publishedHash;
 const previewProjects=publicSections.projects?galleryProjects.filter(p=>p.is_public):[];
 const previewSkills=publicSections.skills?skills:[];
 const previewEducation=publicSections.education?education:[];
 const previewExperience=publicSections.experience?workHistory:[];
 const previewLocation=publicSections.location?profile.location:"";
 const previewWebsite=publicSections.website?profile.website:"";

 async function sendPublicationAction(payload:Record<string,unknown>){
  const {data:{session},error:sessionError}=await client.auth.getSession();
  if(sessionError||!session)throw new Error("Sila log masuk semula.");

  const response=await fetch("/api/portfolio/publish",{
   method:"POST",
   cache:"no-store",
   headers:{"content-type":"application/json",Authorization:`Bearer ${session.access_token}`},
   body:JSON.stringify(payload)
  });

  const data=await response.json() as {ok?:boolean;error?:string};
  if(!response.ok||!data.ok){
   throw new Error(data.error||"Operasi penerbitan gagal.");
  }
 }

 async function confirmPublishing(){
  const action=publishConfirmation;
  setPublishConfirmation(null);

  if(action==="publish"){
   await run(async()=>{
    await sendPublicationAction({
     action:"publish",
     slug:validPortfolioSlug(slug),
     template:theme,
     sections:publicSections,
     noindex,
     openToOpportunities
    });
    setNotice("Portfolio diterbitkan dengan pilihan maklumat awam yang ditetapkan.");
   });
  }else if(action==="unpublish"&&publication){
   await run(async()=>{
    await sendPublicationAction({action:"unpublish"});
    setNotice("Portfolio berjaya dinyahterbitkan.");
   });
  }
 }

 async function deleteConfirmed(){
  const current=deleteConfirmation;
  setDeleteConfirmation(null);
  if(!current)return;

  await run(async()=>{
   if(current.kind==="project"){
    const project=projects.find(item=>item.id===current.id);
    if(!project)throw new Error("Projek tidak ditemui.");
    const paths=projectImages.filter(image=>image.project_id===project.id)
      .map(image=>image.storage_path);
    const {error}=await client.from("projects").delete()
      .eq("id",project.id).eq("user_id",userId);
    if(error)throw error;

    if(paths.length){
     const cleanup=await client.storage.from("project-gallery").remove(paths);
     if(cleanup.error){
      throw new Error("Rekod dipadam tetapi fail galeri memerlukan pembersihan lanjut.");
     }
    }else{
     setUndoProject(project);
    }
    setNotice(paths.length
      ?"Projek bersama galeri telah dipadam."
      :"Projek dipadam. Buat Asal tersedia selama 6 saat.");
   }else{
    const certificate=certs.find(item=>item.id===current.id);
    if(!certificate)throw new Error("Sijil tidak ditemui.");
    const {error}=await client.from("certificates").delete()
      .eq("id",certificate.id).eq("user_id",userId);
    if(error)throw error;
    if(certificate.storage_path){
     const removal=await client.storage.from("certificates")
       .remove([certificate.storage_path]);
     if(removal.error)throw new Error("Metadata dipadam, fail masih perlu dibersihkan.");
    }
    setNotice("Sijil berjaya dipadam.");
   }
  });
 }

 async function undoProjectDeletion(){
  const original=undoProject;
  if(!original)return;
  await run(async()=>{
   const {error}=await client.from("projects").insert({
    id:original.id,
    user_id:userId,
    title:original.title,
    description:original.description,
    url:original.url,
    is_public:original.is_public,
    created_at:original.created_at
   });
   if(error)throw error;
   setUndoProject(null);
   setNotice("Projek dipulihkan.");
  });
 }

 const protectedNotice=<div className="tf-notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Tutup mesej"><X size={14}/></button></div>;
 function emptyBox(title:string,desc:string){return <div className="tf-empty"><div className="tf-emptyicon"><BookOpen size={26}/></div><b>{title}</b><p>{desc}</p></div>}
 return <div className={`tf-app ${dashboardTheme==="neumorph"?"tf-neumorph":""}`}><aside className={`tf-sidebar ${mobile?"opened":""}`}><Link href="/" className="tf-brand"><div className="tf-brandicon tf-logo-mark"><img src="/talentfolio-mark.svg" alt="" width="38" height="38"/></div><span>Talentfolio AI<small>YOUR GROWTH WORKSPACE</small></span></Link>
 <div className="tf-navlabel">WORKSPACE</div><nav>{paths.map(([href,label,Icon])=><Link key={href} onClick={()=>setMobile(false)} href={href} className={pathname===href?"active":""}><Icon size={18}/>{label}</Link>)}</nav>
 <div className="tf-navlabel">DEVELOPMENT</div>
 <div className="tf-side-promo"><span>✦ CAREER GROWTH</span><p>Bina kemahiran, simpan pencapaian dan kongsi portfolio dengan yakin.</p><Link href="/skills">Lihat analisis <ArrowRight size={14}/></Link></div>{section!=="dashboard"&&<SupportPartners variant="dashboard"/>}</aside>
 {mobile&&<button className="tf-mobile-overlay" onClick={()=>setMobile(false)} aria-label="Tutup menu"/>}
 <div className="tf-main"><header className="tf-topbar"><div className="tf-top-left"><button className="tf-menu" onClick={()=>setMobile(!mobile)} aria-label="Buka menu"><Menu size={20}/></button><span>Workspace <span style={{color:"#afbacb"}}>/</span> <strong>{pageTitle}</strong></span></div>
 <div className="tf-top-right"><button type="button" className="tf-theme-toggle" aria-label={dark?"Aktifkan light mode":"Aktifkan dark mode"} title={dark?"Light Mode":"Dark Mode"} onClick={toggleDark}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button><span className="tf-online"><span/> Personal workspace</span><Link href="/profile" aria-label="Profil" className="tf-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt="Foto profil"/>:username.slice(0,2).toUpperCase()}</Link></div></header>
 <main className="tf-content">{notice&&protectedNotice}
 {undoProject&&<div className="tf-undo-toast" role="status">
  <span>Projek &ldquo;{undoProject.title}&rdquo; dipadam. Anda boleh memulihkannya dalam 6 saat.</span>
  <button type="button" onClick={()=>void undoProjectDeletion()} disabled={busy}>Buat Asal</button>
 </div>}
 {loading?<div className="tf-loading"><RefreshCw className="tf-spin"/> Memuatkan ruang kerja anda...</div>:!userId?<div className="tf-signedout"><div className="tf-brandicon tf-logo-mark"><img src="/talentfolio-mark.svg" alt="" width="38" height="38"/></div><h1>Ruang kerja profesional anda</h1><p>Daftar atau log masuk untuk menyimpan profil, sijil, projek dan kemahiran secara selamat.</p><Link className="tf-btn" href="/auth">Daftar / Log masuk <ArrowRight size={16}/></Link><Link href="/" className="tf-link">Lihat laman utama</Link></div>:<>
 {section==="dashboard"&&<><div className="tf-headingrow"><div><div className="tf-eyebrow">PERSONAL WORKSPACE</div><h1>Welcome back, {username.split(" ")[0]} <span>👋</span></h1><p>Everything about your professional journey, in one place.</p></div><div className="tf-form-actions"><button type="button" className="tf-dashboard-theme-switch" disabled={busy} onClick={()=>void run(async()=>{const next=dashboardTheme==="default"?"neumorph":"default";const {error}=await client.from("dashboard_preferences").upsert({user_id:userId,theme:next,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)throw error;setDashboardTheme(next);})}><Sparkles size={15}/>{dashboardTheme==="default"?"Soft Neumorphism":"Default Theme"}</button><Link className="tf-btn tf-btn-outline" href="/portfolio"><ExternalLink size={15}/> View Portfolio</Link></div></div>
 <div className="tf-welcome"><div><small>✦ YOUR PROFESSIONAL JOURNEY</small><h2>Build your future,<br/> one skill at a time.</h2><p>Profil anda {Math.round(completion)}% lengkap. Tambah projek atau sijil untuk menyerlahkan pengalaman dan kebolehan anda.</p><Link className="tf-btn tf-btn-white" href="/profile">Continue Building <ArrowRight size={15}/></Link></div><div className="tf-welcome-orb"/></div>
 <SupportPartners variant="dashboardMain"/>
 <div className="tf-stats">{[[`${Math.round(completion)}%`,"Profile Completion",UserRound],[String(certs.length).padStart(2,"0"),"Certificates",Award],[String(projects.length).padStart(2,"0"),"Featured Projects",FolderKanban],[String(skills.length).padStart(2,"0"),"Skill Areas",Sparkles]].map(([n,l,I])=>{const Icon=I as typeof UserRound;return <div className="tf-stat" key={String(l)}><div><span>{String(l)}</span><span className="tf-stat-icon"><Icon size={18}/></span></div><strong>{String(n)}</strong><small>Data daripada akaun anda</small></div>})}</div>
 <div className="tf-two"><section className="tf-card tf-section"><div className="tf-card-head"><div><h3>Skills Overview</h3><p>Penilaian kendiri yang anda rekodkan</p></div><Link href="/skills" className="tf-text-link">View analysis →</Link></div>
 {skills.length===0?emptyBox("Belum ada kemahiran","Mulakan dengan menambah kemahiran anda di Skills Analysis."):skills.slice(0,5).map(s=><div className="tf-progress" key={s.id}><div><b>{s.name}</b><span>{s.self_rating||0}/5</span></div><div className="tf-track"><div style={{width:`${(s.self_rating||0)*20}%`}}/></div></div>)}
 <div className="tf-insight"><Sparkles size={17}/><span><b>Growth insight</b><br/>Jadikan kemahiran anda lebih meyakinkan dengan menambah projek dan bukti pencapaian.</span></div></section>
 <section className="tf-card tf-section"><div className="tf-card-head"><div><h3>Recent Achievements</h3><p>Perjalanan profesional anda</p></div><span className="tf-pill green">Aktiviti terkini</span></div>
 {[...certs.slice(0,2).map(x=>({name:x.name,type:"Certificate",date:x.created_at})),...projects.slice(0,2).map(x=>({name:x.title,type:"Project",date:x.created_at}))].sort((a,b)=>b.date.localeCompare(a.date)).length===0?emptyBox("Belum ada aktiviti","Sijil dan projek terbaru akan muncul di sini."): [...certs.slice(0,2).map(x=>({name:x.name,type:"Certificate",date:x.created_at})),...projects.slice(0,2).map(x=>({name:x.title,type:"Project",date:x.created_at}))].sort((a,b)=>b.date.localeCompare(a.date)).map((e,i)=><div className="tf-event" key={i}><div className="tf-event-icon">{e.type==="Project"?<BriefcaseBusiness size={18}/>:<Award size={18}/>}</div><div><b>{e.type} added</b><p>{e.name} · {dateText(e.date)}</p></div></div>)}</section></div></>}
 {(section==="education"||section==="experience")&&<HistoryEditor kind={section} userId={userId}/>}
 {section==="profile"&&<><div className="tf-headingrow"><div><div className="tf-eyebrow">PERSONAL IDENTITY</div><h1>My Profile</h1><p>Maklumat ini digunakan untuk portfolio dan analisis kemahiran anda.</p></div><Link href="/settings" className="tf-btn tf-btn-outline"><Settings size={15}/> Account Settings</Link></div>
 <ProfilePhotoEditor userId={userId} url={profile.avatar_url} onChange={url=>setProfile(p=>({...p,avatar_url:url}))}/>
 <form className="tf-card tf-section tf-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const {error}=await client.from("profiles").upsert({user_id:userId,...profile,is_public:false,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)throw error;setNotice("Profil disimpan.")})}}>
 <div className="tf-card-head"><h3>Personal Information</h3><span className="tf-pill">ACCOUNT</span></div><div className="tf-formgrid"><label>Nama penuh<input required value={profile.display_name} onChange={e=>setProfile({...profile,display_name:e.target.value})} maxLength={100}/></label><label>Jenis akaun<select value={profile.user_type} onChange={e=>setProfile({...profile,user_type:e.target.value as Profile["user_type"]})}><option value="student">Pelajar</option><option value="worker">Pekerja</option></select></label><label>Headline profesional<input value={profile.headline} onChange={e=>setProfile({...profile,headline:e.target.value})} maxLength={160} placeholder="Contoh: Junior Software Developer"/></label><label>Lokasi (pilihan)<input value={profile.location} onChange={e=>setProfile({...profile,location:e.target.value})} maxLength={100}/></label><label>Website (pilihan)<input value={profile.website} onChange={e=>setProfile({...profile,website:e.target.value})} placeholder="https://..." maxLength={300}/></label><label className="tf-span2">Tentang saya<textarea rows={5} value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})} maxLength={3000} placeholder="Ceritakan latar belakang, pengalaman dan matlamat anda..."/></label></div>
 <p className="tf-hint"><ShieldCheck size={15}/> Profil database kekal peribadi. Portfolio hanya memaparkan medan yang dipilih apabila anda menekan Publish.</p>
 <div className="tf-form-actions"><button className="tf-btn" disabled={busy}>Simpan Profil <CheckCircle2 size={16}/></button><button type="button" className="tf-btn tf-btn-outline" onClick={async()=>{await client.auth.signOut();window.location.assign("/auth")}}><LogOut size={15}/> Log keluar</button></div></form></>}
 {section==="projects"&&<><div className="tf-headingrow"><div><div className="tf-eyebrow">YOUR WORK</div><h1>Featured Projects</h1><p>Dokumentasikan hasil kerja dan pilih projek untuk portfolio awam.</p></div></div>
 <div className="tf-two"><form className="tf-card tf-section tf-form" onSubmit={e=>{e.preventDefault();void run(async()=>{if(projectForm.url&&!onlyHttp(projectForm.url))throw new Error("Gunakan URL http/https yang sah.");const {error}=await client.from("projects").insert({user_id:userId,...projectForm,url:projectForm.url||null});if(error)throw error;setProjectForm({title:"",description:"",url:"",is_public:true});setNotice("Projek ditambah.")})}}>
 <div className="tf-card-head"><h3>Add New Project</h3><Plus size={18}/></div><label>Nama projek<input required maxLength={120} value={projectForm.title} onChange={e=>setProjectForm({...projectForm,title:e.target.value})}/></label><label>Penerangan<textarea rows={4} maxLength={2000} value={projectForm.description} onChange={e=>setProjectForm({...projectForm,description:e.target.value})}/></label><label>Pautan projek (pilihan)<input type="url" value={projectForm.url} onChange={e=>setProjectForm({...projectForm,url:e.target.value})} placeholder="https://..."/></label><label className="tf-checkbox"><input type="checkbox" checked={projectForm.is_public} onChange={e=>setProjectForm({...projectForm,is_public:e.target.checked})}/> Boleh dipaparkan dalam portfolio apabila diterbitkan</label><button className="tf-btn" disabled={busy}><Plus size={15}/> Tambah Projek</button></form>
 <div className="tf-card tf-section"><div className="tf-card-head"><h3>Project Library</h3><span className="tf-pill">{projects.length} projek</span></div>{!projects.length?emptyBox("Tiada projek","Projek pertama anda akan dipaparkan di sini."):projects.map(p=><div className="tf-listrow" key={p.id}><div className="tf-list-icon"><FolderKanban size={19}/></div><div><b>{p.title}</b><p>{p.description||"Tanpa penerangan"}</p><small>{p.is_public?"Portfolio enabled":"Private"}</small>{p.url&&onlyHttp(p.url)&&<a href={onlyHttp(p.url)||"#"} target="_blank" rel="noopener noreferrer" className="tf-text-link"> View ↗</a>}</div><button aria-label={`Padam ${p.title}`} title="Padam projek" className="tf-iconbutton" disabled={busy} onClick={()=>setDeleteConfirmation({kind:"project",id:p.id,title:p.title})}><Trash2 size={16}/></button></div>)}</div></div><ProjectGalleryEditor userId={userId} projects={projects} onChanged={()=>refresh(userId)}/></>}
 {section==="certificates"&&<><div className="tf-headingrow"><div><div className="tf-eyebrow">SECURE DIGITAL CREDENTIALS</div><h1>Certificate Vault</h1><p>Simpan, urus dan akses sijil peribadi anda dengan selamat.</p></div><span className="tf-pill"><ShieldCheck size={14}/> Private Storage</span></div>
 <form className="tf-upload tf-form" onSubmit={e=>{e.preventDefault();void run(async()=>{if(!certFile)throw new Error("Sila pilih fail sijil.");if(certFile.size>5*1024*1024)throw new Error("Fail melebihi had 5 MB.");if(!["application/pdf","image/jpeg","image/png"].includes(certFile.type))throw new Error("Hanya PDF, PNG dan JPG dibenarkan.");
 const path=`${userId}/${crypto.randomUUID()}.${certFile.type==="application/pdf"?"pdf":certFile.type==="image/png"?"png":"jpg"}`;
 const {error:uploadError}=await client.storage.from("certificates").upload(path,certFile,{upsert:false,contentType:certFile.type});if(uploadError)throw uploadError;
 const {error}=await client.from("certificates").insert({user_id:userId,name:certForm.name,issuer:certForm.issuer||null,issued_on:certForm.issued_on||null,storage_path:path,verification_status:"self_uploaded"});if(error){await client.storage.from("certificates").remove([path]);throw error;}
 setCertForm({name:"",issuer:"",issued_on:""});setCertFile(null);const f=document.getElementById("certUpload") as HTMLInputElement|null;if(f)f.value="";setNotice("Sijil berjaya dimuat naik.");})}}>
 <div className="tf-uploadheading"><UploadCloud size={29}/><div><b>Upload certificates & credentials</b><p>PDF, PNG atau JPG · Maksimum 5 MB · Storan peribadi</p></div></div><div className="tf-formgrid"><label>Nama sijil<input required maxLength={160} value={certForm.name} onChange={e=>setCertForm({...certForm,name:e.target.value})}/></label><label>Institusi penerbit<input maxLength={160} value={certForm.issuer} onChange={e=>setCertForm({...certForm,issuer:e.target.value})}/></label><label>Tarikh dikeluarkan<input type="date" value={certForm.issued_on} onChange={e=>setCertForm({...certForm,issued_on:e.target.value})}/></label><label>Fail sijil<input id="certUpload" required type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/jpeg,image/png" onChange={e=>setCertFile(e.target.files?.[0]||null)}/></label></div><button className="tf-btn" disabled={busy}><Plus size={15}/> {busy?"Memproses...":"Add Certificate"}</button></form>
 <div className="tf-filterbar"><div className="tf-segments">{[["all","All certificates"],["self_uploaded","Self-uploaded"],["pending","Pending"],["verified","Verified"]].map(([val,label])=><button key={val} className={filter===val?"active":""} onClick={()=>setFilter(val)}>{label}</button>)}</div><label className="tf-search"><Search size={15}/><input aria-label="Cari sijil" placeholder="Search certificates..." value={q} onChange={e=>setQ(e.target.value)}/></label></div>
 <div className="tf-certgrid">{certs.filter(c=>(filter==="all"||c.verification_status===filter)&&c.name.toLowerCase().includes(q.toLowerCase())).length===0?emptyBox("Tiada sijil ditemui","Cuba ubah penapis atau muat naik sijil baru."):certs.filter(c=>(filter==="all"||c.verification_status===filter)&&c.name.toLowerCase().includes(q.toLowerCase())).map(c=><article key={c.id} className="tf-certificate"><div className="tf-certificate-art"><Award size={32}/><span>CERTIFICATE OF ACHIEVEMENT</span></div><h3>{c.name}</h3><p>{c.issuer||"Penerbit tidak dinyatakan"} · {dateText(c.issued_on||c.created_at)}</p><div className="tf-certfoot"><span className="tf-pill">{c.verification_status==="verified"?"Verified":c.verification_status==="pending"?"Pending":"Self-uploaded"}</span><div><button title="Muat turun" aria-label={`Muat turun ${c.name}`} className="tf-iconbutton" onClick={()=>{void run(async()=>{if(!c.storage_path)throw new Error("Fail tidak tersedia.");const {data,error}=await client.storage.from("certificates").createSignedUrl(c.storage_path,60);if(error)throw error;window.open(data.signedUrl,"_blank","noopener,noreferrer")})}}><Download size={17}/></button><button title="Padam" aria-label={`Padam ${c.name}`} disabled={busy} className="tf-iconbutton" onClick={()=>setDeleteConfirmation({kind:"certificate",id:c.id,title:c.name})}><Trash2 size={17}/></button></div></div></article>)}</div>
 <p className="tf-warning"><ShieldCheck size={17}/> Sijil yang dimuat naik sendiri tidak dianggap disahkan. Status Verified memerlukan pengesahan daripada penerbit sijil.</p></>}
 {section==="skills"&&<><div className="tf-headingrow"><div><div className="tf-eyebrow">PERSONAL DEVELOPMENT INTELLIGENCE</div><h1>Skills Intelligence</h1><p>Rekod kompetensi kendiri, banding keperluan jawatan dan bina pelan perkembangan.</p></div><span className="tf-pill"><Sparkles size={14}/> Evidence-first</span></div>
 <div className="tf-stats tf-three">{[[skills.length,"Skills Recorded",Sparkles],[projects.length+certs.length,"Evidence Items",Award],[gaps.filter(x=>x.gap>0).length,"Growth Priorities",Target]].map(([n,l,I])=>{const Icon=I as typeof Sparkles;return <div className="tf-stat" key={String(l)}><div><span>{String(l)}</span><span className="tf-stat-icon"><Icon size={18}/></span></div><strong>{String(n).padStart(2,"0")}</strong><small>Current account data</small></div>})}</div>
 <AIAnalysis role={desired.title} skills={skills}/>
 <div className="tf-two"><section className="tf-card tf-section"><div className="tf-card-head"><div><h3>Competency Breakdown</h3><p>Tahap 1–5 yang dinilai oleh pengguna sendiri</p></div></div>{!skills.length?emptyBox("Tiada penilaian","Tambah kemahiran di bawah untuk memulakan analisis."):skills.map(s=><div className="tf-progress" key={s.id}><div><b>{s.name}</b><span>{s.self_rating||0}/5</span></div><div className="tf-track"><div style={{width:`${(s.self_rating||0)*20}%`}}/></div></div>)}
 <div className="tf-insight"><Sparkles size={17}/><span><b>Transparency first</b><br/>Skor ini ialah penilaian kendiri, bukan pengesahan profesional atau penilaian oleh model AI.</span></div></section>
 <section className="tf-card tf-section"><div className="tf-card-head"><div><h3>Target Role & Gap Analysis</h3><p>Target demonstrasi, boleh dikemas kini kemudian</p></div></div><label className="tf-form">Target Role<select value={role} onChange={e=>setRole(e.target.value)}>{CAREER_TARGETS.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
 {gaps.map(g=><div className="tf-gap" key={g.label}><div><b>{g.label}</b><span style={{color:g.gap>0?"#ae7622":"#169d87"}}>{g.gap>0?`Gap +${g.gap}`:g.score===0?"Not assessed":"Meets target"}</span></div><div className="tf-track"><div style={{width:`${g.score*20}%`}}/></div><small>Current {g.score}/5 · Target {g.target}/5</small></div>)}</section></div>
 <div className="tf-two tf-space-top"><SkillEditor userId={userId} skills={skills} onChanged={()=>refresh(userId)}/> <section className="tf-card tf-section"><div className="tf-card-head"><h3>90-Day Growth Roadmap</h3><span className="tf-pill green">RULE-BASED</span></div>{[[30,"Build fundamentals","Pilih satu bidang paling memerlukan perhatian dan lengkapkan modul asas."],[60,"Create stronger evidence","Bina projek praktikal dan dokumentasikan keputusan serta teknologi digunakan."],[90,"Demonstrate readiness","Semak bersama mentor dan kemas kini portfolio untuk jawatan sasaran."]].map(([day,title,description])=><div className="tf-roadmap" key={day}><span>{day}</span><div><b>{title}</b><p>{description}</p></div></div>)}</section></div><p className="tf-warning"><ShieldCheck size={17}/> Ini bukan AI generatif atau pengesahan kelayakan pekerjaan. Perbandingan sasaran adalah ilustrasi dan memerlukan penilaian manusia.</p></>}
 {section==="prompt"&&<PromptGenerator/>}

 {section==="portfolio"&&<>
 <div className="tf-headingrow">
  <div><div className="tf-eyebrow">PORTFOLIO PROFESIONAL</div>
   <h1>Portfolio Builder</h1>
   <p>Pilih reka bentuk, kawal maklumat awam dan semak semuanya sebelum menerbitkan.</p>
  </div>
  {publication?.published&&<a className="tf-btn tf-btn-outline"
    href={`/u/${publication.slug}`} target="_blank" rel="noopener noreferrer">
   <ExternalLink size={15}/> Lihat Portfolio Live</a>}
 </div>
 {publication?.published?
  <div className={`tf-publication-status ${hasUnpublishedChanges?"is-dirty":""}`} role="status">
   <strong><ShieldCheck size={17}/>{hasUnpublishedChanges?"Ada perubahan belum diterbitkan":"Portfolio diterbitkan"}</strong>
   <span>{hasUnpublishedChanges?"Tekan Publish untuk menerbitkan versi terbaru.":"Maklumat yang diterbitkan sepadan dengan pilihan semasa."}</span>
  </div>:
  <div className="tf-publication-status"><strong><Globe2 size={16}/> Belum diterbitkan</strong><span>Hanya anda yang boleh melihat draf ini.</span></div>}
 <div className="tf-portfolio-controls">
  <div className="tf-segments">
   {(["modern","minimal","tech"] as const).map(template=>
    <button key={template} type="button" className={theme===template?"active":""}
      aria-pressed={theme===template} onClick={()=>setTheme(template)}>
      {template[0].toUpperCase()+template.slice(1)}
    </button>)}
  </div>
  <span className="tf-pill"><ShieldCheck size={14}/> Kawalan privasi di tangan anda</span>
 </div>
 <div className="tf-template-gallery-heading">✦ Galeri Portfolio — 9 Template Profesional</div>
 <div className="tf-template-gallery">
  {([
   ["amber","Amber Developer","Dark charcoal · Orange glow","DEVFUSION"],
   ["neon","Neon Cyber","Cyber black · Cyan neon","DevPortfolio"],
   ["crimson","Crimson Editorial","Black & red · Bold typography","PORTFOLIO"],
   ["sunny","Sunny Editorial","Warm cream · Sunshine yellow","SUNNY"],
   ["student3d","Student 3D","Indigo · Dimensi kreatif","STUDENT"],
   ["noirluxe","Noir Luxe Editorial","Black · Burgundy · Beige","NOIR LUXE"]
  ] as const).map(([value,label,desc,art])=>
   <button type="button" key={value} className={`tf-template-card ${theme===value?"selected":""}`}
    onClick={()=>setTheme(value)} aria-pressed={theme===value}>
    <div className={`tf-template-art ${value}`}><span>{art}</span></div>
    <div className="tf-template-caption"><b>{label} {theme===value?"✓":""}</b><small>{desc}</small></div>
   </button>)}
 </div>
 <div className="tf-preview-privacy" role="note">
  Pratonton ini menggunakan pilihan seksyen semasa. Sijil peribadi dan alamat e-mel tidak akan dipaparkan.
 </div>
 {(["sunny","student3d","noirluxe"] as string[]).includes(theme)?
  <div className="tf-portfolio-new-preview"><ExpansionThemes
    theme={theme as ExpansionTheme} name={username} headline={profile.headline}
    bio={profile.bio} location={previewLocation} avatar={profile.avatar_url}
    website={previewWebsite} skills={previewSkills} projects={previewProjects}
    education={previewEducation.map(e=>({institution:e.institution,qualification:e.qualification,field:e.field_of_study,start:e.start_year,end:e.end_year,description:e.description}))}
    experience={previewExperience.map(e=>({company:e.company,role:e.role,start:e.start_date,end:e.end_date,description:e.description}))}
    certCount={0} openToOpportunities={openToOpportunities} preview/></div>:
  (["amber","neon","crimson"] as string[]).includes(theme)?
   <div className="tf-portfolio-new-preview"><PortfolioThemes
     theme={theme as NewTheme} name={username} headline={profile.headline}
     bio={profile.bio} location={previewLocation} avatar={profile.avatar_url}
     website={previewWebsite} skills={previewSkills} projects={previewProjects}
     education={previewEducation.map(e=>({institution:e.institution,qualification:e.qualification,field:e.field_of_study,start:e.start_year,end:e.end_year,description:e.description}))}
     experience={previewExperience.map(e=>({company:e.company,role:e.role,start:e.start_date,end:e.end_date,description:e.description}))}
     openToOpportunities={openToOpportunities} preview/></div>:
   <div className="tf-portfolio-new-preview">
    <PublicPortfolioClassic
     template={theme}
     s={draftSnapshot}
     avatar={profile.avatar_url}
     website={previewWebsite}
     safeProjects={previewProjects.map(project=>({
      title:project.title,description:project.description,
      url:project.url||"",images:project.images
     }))}
    />
   </div>
 }
 <form className="tf-card tf-section tf-form" onSubmit={event=>{
    event.preventDefault();
    try{validPortfolioSlug(slug);setNotice("");setPublishConfirmation("publish");}
    catch(error){setNotice(errText(error));}
 }}>
  <div className="tf-card-head">
   <h3>Kawal Penerbitan Portfolio</h3>
   <span className="tf-pill">{publication?.published?"Published":"Draft"}</span>
  </div>
  <p className="tf-publication-hint">
   Nama, headline, bio dan foto profil akan kelihatan apabila portfolio diterbitkan.
   Pilih seksyen lain yang ingin dikongsi. Fail sijil peribadi dan e-mel akaun kekal tersembunyi.
  </p>
  <h4>Pilih maklumat yang akan dipaparkan</h4>
  <div className="tf-publish-options">
   {PUBLIC_SECTIONS.map(([key,label])=>
    <label className="tf-publish-option" key={key}>
     <input type="checkbox" checked={publicSections[key]}
      onChange={event=>setPublicSections(previous=>({...previous,[key]:event.target.checked}))}/>
     <span>{label}</span>
    </label>)}
  </div>
  <label>Nama pautan portfolio
   <input required value={slug} onChange={event=>setSlug(nameSlug(event.target.value))}
    minLength={3} maxLength={48}/>
  </label>
  <span className="tf-publish-url">https://talent-portfolio-ai.vercel.app/u/{slug||"nama-anda"}</span>
  <div className="tf-publish-privacy">
   <label><input type="checkbox" checked={openToOpportunities}
     onChange={event=>setOpenToOpportunities(event.target.checked)}/>
    Paparkan saya terbuka kepada peluang kerjaya dan kolaborasi
   </label>
   <label><input type="checkbox" checked={noindex}
     onChange={event=>setNoindex(event.target.checked)}/>
    Jangan indeks portfolio saya di Google dan enjin carian lain
   </label>
   <p>Pautan awam masih boleh dibuka oleh sesiapa yang mempunyai URL. Opsyen noindex meminta enjin carian tidak mengindeks, bukan menjadikan portfolio peribadi.</p>
  </div>
  <div className="tf-form-actions">
   <button className="tf-btn" type="submit" disabled={busy}>
    <Globe2 size={15}/>{publication?.published?"Terbitkan Perubahan":"Publish Portfolio"}
   </button>
   {publication?.published&&<button type="button" className="tf-btn tf-btn-outline"
     disabled={busy} onClick={()=>setPublishConfirmation("unpublish")}>
    <X size={15}/> Nyahterbit Portfolio
   </button>}
  </div>
 </form>
 </>}

 </>}</main>
 <ConfirmDialog
  open={publishConfirmation!==null}
  title={publishConfirmation==="publish"?"Sahkan penerbitan portfolio":"Nyahterbit portfolio?"}
  description={publishConfirmation==="publish"
   ?"Sila semak pautan dan maklumat awam di bawah sebelum menerbitkan."
   :"Portfolio awam tidak lagi boleh dibuka. Maklumat peribadi anda akan kekal disimpan dalam akaun."}
  confirmLabel={publishConfirmation==="publish"?"Ya, Terbitkan":"Ya, Nyahterbit"}
  danger={publishConfirmation==="unpublish"}
  busy={busy}
  onClose={()=>setPublishConfirmation(null)}
  onConfirm={()=>void confirmPublishing()}
 >
  {publishConfirmation==="publish"&&<>
   <strong>URL Portfolio</strong>
   <span className="tf-publish-url">https://talent-portfolio-ai.vercel.app/u/{slug}</span>
   <div className="tf-publish-section-summary">
    <span><CheckCircle2 size={15}/> Nama, headline, bio dan foto profil</span>
    {PUBLIC_SECTIONS.filter(([key])=>publicSections[key]).map(([key,label])=>
     <span key={key}><CheckCircle2 size={15}/>{label}</span>)}
   </div>
   <p className="tf-publication-hint">Tidak termasuk sijil peribadi atau e-mel akaun. {noindex?"Enjin carian diminta untuk tidak mengindeks halaman ini.":"Halaman boleh diindeks oleh enjin carian."}</p>
  </>}
 </ConfirmDialog>

 <ConfirmDialog
  open={deleteConfirmation!==null}
  title={deleteConfirmation?.kind==="project"?"Padam projek?":"Padam sijil?"}
  description={deleteConfirmation?.kind==="project"
   ?`Projek "${deleteConfirmation.title}" dan gambar galerinya akan dipadam. Projek tanpa galeri boleh dipulihkan dalam 6 saat.`
   :`Sijil "${deleteConfirmation?.title||""}" dan fail berkaitannya akan dipadam secara kekal.`}
  confirmLabel={deleteConfirmation?.kind==="project"?"Padam Projek":"Padam Sijil"}
  danger busy={busy}
  onClose={()=>setDeleteConfirmation(null)}
  onConfirm={()=>void deleteConfirmed()}
 />
 <div className="tf-footer">© {new Date().getFullYear()} Talentfolio AI · Privacy-first portfolio workspace · Free MVP</div></div></div>;
}

````

## 2. `components/history-editor.tsx`

````tsx
"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState, type FormEvent,
} from "react";
import {
  Award, BriefcaseBusiness, GraduationCap, Plus, Trash2,
  Pencil, X, Undo2,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import ConfirmDialog from "@/components/confirm-dialog";

type Education = {
  id: string;
  institution: string;
  qualification: string;
  field_of_study: string;
  start_year: number | null;
  end_year: number | null;
  description: string;
  created_at: string;
};

type Work = {
  id: string;
  company: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
  description: string;
  created_at: string;
};

type Kind = "education" | "experience";

const emptyEducation = {
  institution: "",
  qualification: "",
  field_of_study: "",
  start_year: "",
  end_year: "",
  description: "",
};

const emptyWork = {
  company: "",
  role: "",
  start_date: "",
  end_date: "",
  description: "",
};

type UndoRecord =
  | { kind: "education"; record: Education }
  | { kind: "experience"; record: Work };

function messageForError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("23505")) {
      return "Rekod ini sudah wujud. Semak butiran sebelum menyimpan.";
    }
    if (error.message.includes("23514")) {
      return "Maklumat melanggar had atau format database.";
    }
    return error.message;
  }
  return "Rekod tidak dapat disimpan. Sila cuba lagi.";
}

export default function HistoryEditor({
  kind, userId,
}: {
  kind: Kind;
  userId: string;
}) {
  const client = useMemo(() => getSupabaseClient(), []);
  const formRef = useRef<HTMLFormElement>(null);

  const [education, setEducation] = useState<Education[]>([]);
  const [experience, setExperience] = useState<Work[]>([]);
  const [eduForm, setEduForm] = useState(emptyEducation);
  const [workForm, setWorkForm] = useState(emptyWork);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<UndoRecord | null>(null);
  const [undoRecord, setUndoRecord] = useState<UndoRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const table = kind === "education" ? "education" : "work_experience";
  const isEducation = kind === "education";
  const Icon = isEducation ? GraduationCap : BriefcaseBusiness;

  const load = useCallback(async () => {
    const result = await client
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (result.error) throw new Error(result.error.message);

    if (kind === "education") {
      setEducation((result.data ?? []) as Education[]);
    } else {
      setExperience((result.data ?? []) as Work[]);
    }
  }, [client, kind, table, userId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (active) await load();
      } catch (error) {
        if (active) setErrorMessage(messageForError(error));
      }
    })();
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (!undoRecord) return;
    const timeout = window.setTimeout(() => setUndoRecord(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [undoRecord]);

  function clearForm() {
    setEditingId(null);
    setEduForm(emptyEducation);
    setWorkForm(emptyWork);
  }

  function beginEdit(record: Education | Work) {
    setErrorMessage("");
    setMessage("");
    setEditingId(record.id);
    if ("institution" in record) {
      setEduForm({
        institution: record.institution,
        qualification: record.qualification,
        field_of_study: record.field_of_study,
        start_year: record.start_year?.toString() ?? "",
        end_year: record.end_year?.toString() ?? "",
        description: record.description,
      });
    } else {
      setWorkForm({
        company: record.company,
        role: record.role,
        start_date: record.start_date ?? "",
        end_date: record.end_date ?? "",
        description: record.description,
      });
    }

    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (isEducation) {
        if (!eduForm.institution.trim() || !eduForm.qualification.trim()) {
          throw new Error("Nama institusi dan kelayakan wajib diisi.");
        }

        const payload = {
          institution: eduForm.institution.trim(),
          qualification: eduForm.qualification.trim(),
          field_of_study: eduForm.field_of_study.trim(),
          start_year: eduForm.start_year ? Number(eduForm.start_year) : null,
          end_year: eduForm.end_year ? Number(eduForm.end_year) : null,
          description: eduForm.description.trim(),
        };

        if (
          payload.start_year &&
          payload.end_year &&
          payload.start_year > payload.end_year
        ) {
          throw new Error("Tahun tamat tidak boleh mendahului tahun mula.");
        }

        const previous = [...education];
        if (editingId) {
          setEducation((items) =>
            items.map((item) =>
              item.id === editingId ? { ...item, ...payload } : item,
            ),
          );
        }

        const result = editingId
          ? await client.from("education").update(payload)
            .eq("id", editingId).eq("user_id", userId)
          : await client.from("education").insert({
            ...payload,
            user_id: userId,
          });

        if (result.error) {
          setEducation(previous);
          throw new Error(result.error.message);
        }
      } else {
        if (!workForm.company.trim() || !workForm.role.trim()) {
          throw new Error("Nama organisasi dan jawatan wajib diisi.");
        }
        if (
          workForm.start_date &&
          workForm.end_date &&
          workForm.start_date > workForm.end_date
        ) {
          throw new Error("Tarikh tamat tidak boleh mendahului tarikh mula.");
        }

        const payload = {
          company: workForm.company.trim(),
          role: workForm.role.trim(),
          start_date: workForm.start_date || null,
          end_date: workForm.end_date || null,
          description: workForm.description.trim(),
        };

        const previous = [...experience];
        if (editingId) {
          setExperience((items) =>
            items.map((item) =>
              item.id === editingId ? { ...item, ...payload } : item,
            ),
          );
        }

        const result = editingId
          ? await client.from("work_experience").update(payload)
            .eq("id", editingId).eq("user_id", userId)
          : await client.from("work_experience").insert({
            ...payload,
            user_id: userId,
          });

        if (result.error) {
          setExperience(previous);
          throw new Error(result.error.message);
        }
      }

      setMessage(editingId ? "Rekod berjaya dikemas kini." : "Rekod baharu berjaya ditambah.");
      clearForm();
      await load();
    } catch (error) {
      setErrorMessage(messageForError(error));
      try { await load(); } catch { /* preserve original failure */ }
    } finally {
      setBusy(false);
    }
  }

  async function deleteConfirmed() {
    const target = pendingDeletion;
    setPendingDeletion(null);
    if (!target || busy) return;
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      const result = await client.from(table).delete()
        .eq("id", target.record.id).eq("user_id", userId);
      if (result.error) throw new Error(result.error.message);

      if (editingId === target.record.id) clearForm();
      await load();
      setUndoRecord(target);
      setMessage("Rekod dipadam. Anda boleh buat asal dalam 6 saat.");
    } catch (error) {
      setErrorMessage(messageForError(error));
    } finally {
      setBusy(false);
    }
  }

  async function undoDeletion() {
    const target = undoRecord;
    if (!target || busy) return;
    setBusy(true);
    setErrorMessage("");

    try {
      const result = target.kind === "education"
        ? await client.from("education").insert({
          ...target.record,
          user_id: userId,
        })
        : await client.from("work_experience").insert({
          ...target.record,
          user_id: userId,
        });
      if (result.error) throw new Error(result.error.message);
      await load();
      setMessage("Rekod dipulihkan.");
      setUndoRecord(null);
    } catch (error) {
      setErrorMessage(messageForError(error));
    } finally {
      setBusy(false);
    }
  }

  const items = isEducation ? education : experience;

  return (
    <>
      <div className="tf-headingrow">
        <div>
          <div className="tf-eyebrow">REKOD PERJALANAN PROFESIONAL</div>
          <h1>{isEducation ? "Sejarah Pendidikan" : "Pengalaman Kerja"}</h1>
          <p>
            {isEducation
              ? "Tambah dan kemas kini kelayakan serta pembelajaran anda."
              : "Urus jawatan, tanggungjawab dan sejarah pekerjaan anda."}
          </p>
        </div>
        <span className="tf-pill">
          <Icon size={15} /> {items.length} rekod
        </span>
      </div>

      <div className="tf-two">
        <form className="tf-card tf-section tf-form" ref={formRef} onSubmit={(event) => void save(event)}>
          <div className="tf-card-head">
            <h3>
              {editingId ? "Kemaskini Rekod" : isEducation ? "Tambah Pendidikan" : "Tambah Pekerjaan"}
            </h3>
            {editingId ? <Pencil size={18} /> : <Plus size={18} />}
          </div>

          {isEducation ? (
            <>
              <label>Institusi
                <input required maxLength={180} value={eduForm.institution}
                  onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })} />
              </label>
              <label>Kelayakan / Sijil
                <input required maxLength={180} value={eduForm.qualification}
                  onChange={(e) => setEduForm({ ...eduForm, qualification: e.target.value })} />
              </label>
              <label>Bidang Pengajian
                <input maxLength={180} value={eduForm.field_of_study}
                  onChange={(e) => setEduForm({ ...eduForm, field_of_study: e.target.value })} />
              </label>
              <div className="tf-formgrid">
                <label>Tahun mula
                  <input type="number" min={1950} max={2100}
                    value={eduForm.start_year}
                    onChange={(e) => setEduForm({ ...eduForm, start_year: e.target.value })} />
                </label>
                <label>Tahun tamat
                  <input type="number" min={1950} max={2100}
                    value={eduForm.end_year}
                    onChange={(e) => setEduForm({ ...eduForm, end_year: e.target.value })} />
                </label>
              </div>
              <label>Penerangan
                <textarea rows={4} maxLength={2000}
                  value={eduForm.description}
                  onChange={(e) => setEduForm({ ...eduForm, description: e.target.value })} />
              </label>
            </>
          ) : (
            <>
              <label>Nama syarikat / organisasi
                <input required maxLength={180} value={workForm.company}
                  onChange={(e) => setWorkForm({ ...workForm, company: e.target.value })} />
              </label>
              <label>Jawatan
                <input required maxLength={180} value={workForm.role}
                  onChange={(e) => setWorkForm({ ...workForm, role: e.target.value })} />
              </label>
              <div className="tf-formgrid">
                <label>Tarikh mula
                  <input type="date" value={workForm.start_date}
                    onChange={(e) => setWorkForm({ ...workForm, start_date: e.target.value })} />
                </label>
                <label>Tarikh tamat (kosong jika masih bekerja)
                  <input type="date" value={workForm.end_date}
                    onChange={(e) => setWorkForm({ ...workForm, end_date: e.target.value })} />
                </label>
              </div>
              <label>Tanggungjawab / hasil kerja
                <textarea rows={5} maxLength={3000}
                  value={workForm.description}
                  onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })} />
              </label>
            </>
          )}

          <div className="tf-form-actions">
            <button className="tf-btn" type="submit" disabled={busy}>
              {editingId ? <Pencil size={15} /> : <Plus size={15} />}
              {busy ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Rekod"}
            </button>
            {editingId && (
              <button type="button" className="tf-btn tf-btn-outline"
                disabled={busy} onClick={clearForm}>
                <X size={15} /> Batal Edit
              </button>
            )}
          </div>
          {message && <p className="tf-hint" role="status">{message}</p>}
          {errorMessage && <p className="tf-auth-error" role="alert">{errorMessage}</p>}
          {undoRecord && (
            <button type="button" className="tf-btn tf-btn-outline"
              disabled={busy} onClick={() => void undoDeletion()}>
              <Undo2 size={15} /> Buat Asal Padam (6 saat)
            </button>
          )}
        </form>

        <section className="tf-card tf-section">
          <div className="tf-card-head">
            <h3>{isEducation ? "Pendidikan Saya" : "Garis Masa Kerjaya"}</h3>
            <span className="tf-pill">DATA PERIBADI</span>
          </div>
          {items.length === 0 ? (
            <div className="tf-empty">
              <Icon size={27} />
              <b>Tiada rekod lagi</b>
              <p>Tambah rekod pertama menggunakan borang di sebelah.</p>
            </div>
          ) : (
            isEducation ? education.map((item) => (
              <div className="tf-listrow" key={item.id}>
                <div className="tf-list-icon"><Award size={19} /></div>
                <div>
                  <b>{item.qualification}</b>
                  <p>{item.institution}{item.field_of_study ? " · " + item.field_of_study : ""}</p>
                  <small>{item.start_year ?? "—"} – {item.end_year ?? "Kini"}</small>
                  {item.description && <p>{item.description}</p>}
                </div>
                <button type="button" className="tf-iconbutton" disabled={busy}
                  aria-label={`Edit ${item.qualification}`}
                  onClick={() => beginEdit(item)}>
                  <Pencil size={17} />
                </button>
                <button type="button" className="tf-iconbutton" disabled={busy}
                  aria-label={`Padam ${item.qualification}`}
                  onClick={() => setPendingDeletion({ kind: "education", record: item })}>
                  <Trash2 size={17} />
                </button>
              </div>
            )) : experience.map((item) => (
              <div className="tf-listrow" key={item.id}>
                <div className="tf-list-icon"><BriefcaseBusiness size={19} /></div>
                <div>
                  <b>{item.role}</b>
                  <p>{item.company}</p>
                  <small>{item.start_date ?? "—"} – {item.end_date ?? "Kini"}</small>
                  {item.description && <p>{item.description}</p>}
                </div>
                <button type="button" className="tf-iconbutton" disabled={busy}
                  aria-label={`Edit ${item.role}`}
                  onClick={() => beginEdit(item)}>
                  <Pencil size={17} />
                </button>
                <button type="button" className="tf-iconbutton" disabled={busy}
                  aria-label={`Padam ${item.role}`}
                  onClick={() => setPendingDeletion({ kind: "experience", record: item })}>
                  <Trash2 size={17} />
                </button>
              </div>
            ))
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingDeletion !== null}
        title="Padam rekod ini?"
        description={
          pendingDeletion?.kind === "education"
            ? "Rekod pendidikan akan dipadam. Anda boleh membatalkannya dalam 6 saat."
            : "Rekod pekerjaan akan dipadam. Anda boleh membatalkannya dalam 6 saat."
        }
        confirmLabel="Padam Rekod"
        danger
        busy={busy}
        onClose={() => setPendingDeletion(null)}
        onConfirm={() => void deleteConfirmed()}
      />
    </>
  );
}

````

## 3. `components/skill-editor.tsx`

````tsx
"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {Plus,Save,Trash2,Pencil,CheckCircle2,Undo2} from "lucide-react";
import ConfirmDialog from "@/components/confirm-dialog";
import {getSupabaseClient} from "@/lib/supabase";
type Skill={id:string;name:string;self_rating:number|null;created_at:string};
export default function SkillEditor({userId,skills,onChanged}:{userId:string;skills:Skill[];onChanged:()=>Promise<void>}){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [name,setName]=useState(""),[rating,setRating]=useState(3),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [pendingDelete,setPendingDelete]=useState<Skill|null>(null);
 const [undoSkill,setUndoSkill]=useState<Skill|null>(null);
 const presets=["Cloud Computing","Web Development","Python","JavaScript","TypeScript","React","Next.js","Supabase","Proxmox","Docker","Networking","Cybersecurity","Database","UI/UX Design","Communication","Leadership"];
 async function save(e:FormEvent){e.preventDefault();if(!name.trim())return;setBusy(true);setNotice("");try{
   const clean=name.trim().replace(/\s+/g," ");if(clean.length>80)throw new Error("Nama kemahiran maksimum 80 aksara.");
   const existing=skills.find(x=>x.name.toLowerCase()===clean.toLowerCase()&&x.id!==editing);
   if(existing)throw new Error("Kemahiran ini sudah wujud. Klik Edit untuk mengubah tahapnya.");
   if(editing){const {data,error}=await db.from("skills").update({name:clean,self_rating:rating}).eq("id",editing).eq("user_id",userId).select("id").single();if(error)throw error;if(!data)throw Error("Rekod tidak dikemas kini.");}
   else{const {data,error}=await db.from("skills").insert({user_id:userId,name:clean,self_rating:rating}).select("id").single();if(error)throw error;if(!data)throw Error("Rekod tidak disimpan.");}
   await onChanged();setName("");setEditing(null);setRating(3);setNotice("Kemahiran berjaya disimpan.");
 }catch(err){setNotice(err instanceof Error?err.message:"Gagal menyimpan kemahiran.");}finally{setBusy(false)}}
 async function removeConfirmed(){
  const item=pendingDelete;
  setPendingDelete(null);
  if(!item||busy)return;
  setBusy(true);
  try{
   const {error}=await db.from("skills").delete()
     .eq("id",item.id).eq("user_id",userId);
   if(error)throw new Error(error.message);
   await onChanged();
   if(editing===item.id){setEditing(null);setName("");}
   setUndoSkill(item);
   setNotice("Kemahiran dipadam. Buat Asal dalam 6 saat jika perlu.");
  }catch(error){
   setNotice(error instanceof Error?error.message:"Gagal memadam kemahiran.");
  }finally{setBusy(false)}
 }
 async function undoDeletion(){
  if(!undoSkill||busy)return;
  setBusy(true);
  try{
   const {error}=await db.from("skills").insert({
    id:undoSkill.id,user_id:userId,name:undoSkill.name,
    self_rating:undoSkill.self_rating,created_at:undoSkill.created_at
   });
   if(error)throw new Error(error.message);
   await onChanged();
   setNotice("Kemahiran dipulihkan.");
   setUndoSkill(null);
  }catch(error){
   setNotice(error instanceof Error?error.message:"Tidak dapat memulihkan rekod.");
  }finally{setBusy(false)}
 }
 useEffect(()=>{
  if(!undoSkill)return;
  const timer=window.setTimeout(()=>setUndoSkill(null),6000);
  return()=>window.clearTimeout(timer);
 },[undoSkill]);
 useEffect(()=>{if(editing&&!skills.some(x=>x.id===editing)){setEditing(null);setName("");}},[editing,skills]);
 return <section className="tf-card tf-section"><div className="tf-card-head"><div><h3>Tambah / Edit Kemahiran</h3><p>Taip apa-apa kemahiran, bukan terhad kepada lima kategori sahaja.</p></div><Plus size={18}/></div>
 <form className="tf-form" onSubmit={save}><label>Nama kemahiran<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: Proxmox, AWS, Python, CCTV, CNC..."/></label>
 <div className="tf-skill-presets">{presets.map(x=><button key={x} type="button" className={name===x?"active":""} onClick={()=>setName(x)}>{x}</button>)}</div>
 <label>Penilaian kendiri ({rating}/5)<input type="range" min={1} max={5} step={1} value={rating} onChange={e=>setRating(Number(e.target.value))}/></label>
 <div className="tf-form-actions"><button className="tf-btn" disabled={busy||!name.trim()}><Save size={15}/>{editing?"Kemas Kini Skill":"Simpan Skill"}</button>{editing&&<button className="tf-btn tf-btn-outline" type="button" onClick={()=>{setEditing(null);setName("");setRating(3);}}>Batal Edit</button>}</div>
 </form>
 {notice&&<p role="status" className="tf-hint" style={{marginTop:12}}>{notice}</p>}
 <div className="tf-skill-list">{skills.map(s=><div className="tf-listrow" key={s.id}><div className="tf-list-icon"><CheckCircle2 size={17}/></div><div><b>{s.name}</b><p>Penilaian sendiri: {s.self_rating||0}/5</p></div><button className="tf-iconbutton" title="Edit" aria-label={"Edit "+s.name} onClick={()=>{setEditing(s.id);setName(s.name);setRating(s.self_rating||3)}}><Pencil size={16}/></button><button className="tf-iconbutton" title="Padam" aria-label={"Padam "+s.name} disabled={busy} onClick={()=>setPendingDelete(s)}><Trash2 size={16}/></button></div>)}</div>
 {undoSkill&&<button type="button" className="tf-btn tf-btn-outline"
  onClick={()=>void undoDeletion()} disabled={busy} style={{marginTop:12}}>
  <Undo2 size={15}/> Buat Asal Padam — 6 saat
 </button>}
 <ConfirmDialog
   open={pendingDelete!==null}
   title="Padam kemahiran?"
   description={`Kemahiran "${pendingDelete?.name||""}" akan dipadam. Anda boleh memulihkannya dalam masa 6 saat.`}
   confirmLabel="Padam Kemahiran"
   danger busy={busy}
   onClose={()=>setPendingDelete(null)}
   onConfirm={()=>void removeConfirmed()}
 />
 </section>;
}

````

## 4. `components/project-gallery-editor.tsx`

````tsx
"use client";
import {useCallback,useEffect,useMemo,useState,useRef,type ChangeEvent} from "react";
import {ArrowDown,ArrowUp,Camera,Check,ImagePlus,Images,Save,Star,Trash2,UploadCloud} from "lucide-react";
import {getSupabaseClient} from "@/lib/supabase";
import ConfirmDialog from "@/components/confirm-dialog";

export type GalleryImage={id:string;project_id:string;user_id:string;storage_path:string;caption:string;sort_order:number;is_cover:boolean;created_at:string};
export type GalleryProject={id:string;title:string;description:string;url:string|null;is_public:boolean};
const BUCKET="project-gallery",MAX_BYTES=5*1024*1024,MAX_PER_PROJECT=12;
const ext=(f:File)=>f.type==="image/png"?"png":f.type==="image/webp"?"webp":"jpg";
const valid=(f:File)=>["image/jpeg","image/png","image/webp"].includes(f.type)&&f.size<=MAX_BYTES;
const msg=(e:unknown)=>e instanceof Error?e.message:"Operasi gagal.";
export default function ProjectGalleryEditor({userId,projects,onChanged}:{userId:string;projects:GalleryProject[];onChanged:()=>Promise<void>}){
 const supabase=useMemo(()=>getSupabaseClient(),[]);
 const [selected,setSelected]=useState("");
 const [images,setImages]=useState<GalleryImage[]>([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[notice,setNotice]=useState("");
 const [pendingDeletion,setPendingDeletion]=useState<GalleryImage|null>(null);
 const fileInput=useRef<HTMLInputElement>(null);
 const [previews,setPreviews]=useState<string[]>([]);
 const [files,setFiles]=useState<File[]>([]),[dragActive,setDragActive]=useState(false),[draft,setDraft]=useState({title:"",description:"",url:"",is_public:false});
 const [captions,setCaptions]=useState<Record<string,string>>({});
 const project=projects.find(x=>x.id===selected)||null;
 useEffect(()=>{const urls=files.map(file=>URL.createObjectURL(file));setPreviews(urls);return()=>urls.forEach(URL.revokeObjectURL);},[files]);
 useEffect(()=>{if(!selected||!projects.some(x=>x.id===selected))setSelected(projects[0]?.id||"");},[projects,selected]);
 useEffect(()=>{if(project)setDraft({title:project.title,description:project.description,url:project.url||"",is_public:project.is_public});},[project]);
 const load=useCallback(async(projectId:string)=>{
  if(!projectId){setImages([]);return;}
  setLoading(true);
  const {data,error}=await supabase.from("project_images").select("id,project_id,user_id,storage_path,caption,sort_order,is_cover,created_at").eq("user_id",userId).eq("project_id",projectId).order("sort_order",{ascending:true}).order("created_at",{ascending:true});
  setLoading(false);
  if(error){setNotice(error.message);return;}
  const rows=(data||[]) as GalleryImage[];
  setImages(rows);setCaptions(Object.fromEntries(rows.map(x=>[x.id,x.caption])));
 },[supabase,userId]);
 useEffect(()=>{void load(selected);},[load,selected]);
 async function act(fn:()=>Promise<void>){setBusy(true);setNotice("");try{await fn();await onChanged();await load(selected);}catch(e){setNotice(msg(e))}finally{setBusy(false)}}
 function checkFiles(added:File[]){setFiles(added);const bad=added.filter(x=>!valid(x));setNotice(bad.length?"Hanya JPG, PNG atau WebP maksimum 5 MB setiap gambar dibenarkan.":"");}
 function choose(e:ChangeEvent<HTMLInputElement>){checkFiles(Array.from(e.target.files||[]));}
 async function upload(){if(!project||!files.length)return;await act(async()=>{
  const good=files.filter(valid);if(good.length!==files.length)throw new Error("Semak jenis dan saiz gambar.");
  if(images.length+good.length>MAX_PER_PROJECT)throw new Error(`Maksimum ${MAX_PER_PROJECT} gambar bagi setiap projek.`);
  for(let i=0;i<good.length;i++){
   const file=good[i],path=`${userId}/${project.id}/${crypto.randomUUID()}.${ext(file)}`;
   const {error:uploadError}=await supabase.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   const {error:dbError}=await supabase.from("project_images").insert({user_id:userId,project_id:project.id,storage_path:path,caption:"",sort_order:images.length+i,is_cover:images.length===0&&i===0});
   if(dbError){await supabase.storage.from(BUCKET).remove([path]);throw dbError;}
  }
  setFiles([]);const inp=document.getElementById("project-gallery-upload") as HTMLInputElement|null;if(inp)inp.value="";
  setNotice("Gambar berjaya dimuat naik. Tekan Publish semula untuk kemas kini portfolio awam.");
 });}
 async function saveDetails(){if(!project)return;await act(async()=>{if(!draft.title.trim())throw Error("Nama projek wajib diisi.");const url=draft.url.trim();if(url){const u=new URL(url);if(!["https:","http:"].includes(u.protocol))throw Error("URL mesti menggunakan https/http.");}
  const {error}=await supabase.from("projects").update({title:draft.title.trim(),description:draft.description.trim(),url:url||null,is_public:draft.is_public}).eq("id",selected).eq("user_id",userId);if(error)throw error;setNotice("Penerangan projek dikemas kini. Publish semula untuk paparkan perubahan.");
 });}
 async function saveCaption(im:GalleryImage){await act(async()=>{const {error}=await supabase.from("project_images").update({caption:(captions[im.id]||"").trim()}).eq("id",im.id).eq("user_id",userId);if(error)throw error;setNotice("Kapsyen gambar disimpan.");});}
 async function cover(image:GalleryImage){
  await act(async()=>{
    const {error}=await supabase.rpc("set_project_cover",{p_image_id:image.id});
    if(error)throw error;
    setNotice("Gambar utama berjaya ditetapkan secara atomik.");
  });
}
 async function move(im:GalleryImage,step:number){const i=images.findIndex(x=>x.id===im.id),other=images[i+step];if(!other)return;await act(async()=>{const {error:e1}=await supabase.from("project_images").update({sort_order:other.sort_order}).eq("id",im.id).eq("user_id",userId);if(e1)throw e1;const {error:e2}=await supabase.from("project_images").update({sort_order:im.sort_order}).eq("id",other.id).eq("user_id",userId);if(e2)throw e2;});}
 async function removeConfirmed(){
 const image=pendingDeletion;
 setPendingDeletion(null);
 if(!image)return;
 await act(async()=>{
  const {error}=await supabase.from("project_images")
   .delete().eq("id",image.id).eq("user_id",userId);
  if(error)throw error;
  const removal=await supabase.storage.from(BUCKET).remove([image.storage_path]);
  if(removal.error)throw new Error("Metadata dipadam, tetapi fail masih perlu dibersihkan: "+removal.error.message);
  setNotice("Gambar dipadam.");
 });
}
 if(!projects.length)return null;
 return <section className="tf-card tf-section tf-gallery-editor">
   <div className="tf-card-head"><div><h3>Work Photo Gallery</h3><p>Muat naik hasil kerja, susun gambar dan ceritakan proses projek anda.</p></div><span className="tf-pill"><Images size={14}/> {images.length}/{MAX_PER_PROJECT} images</span></div>
   <div className="tf-gallery-projects">{projects.map(p=><button key={p.id} type="button" className={p.id===selected?"active":""} onClick={()=>{setSelected(p.id);setFiles([]);setNotice("");}}>{p.title}</button>)}</div>
   {project&&<><div className="tf-gallery-layout"><div className="tf-gallery-fields">
   <h4>Maklumat projek</h4><label>Tajuk kerja<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} maxLength={120}/></label>
   <label>Penerangan / proses kerja<textarea rows={5} maxLength={2000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Objektif, cabaran, proses, teknologi dan hasil kerja..."/></label>
   <label>URL projek (pilihan)<input type="url" value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})} placeholder="https://..."/></label>
   <label className="tf-checkbox"><input type="checkbox" checked={draft.is_public} onChange={e=>setDraft({...draft,is_public:e.target.checked})}/> Benarkan projek dan gambar dipaparkan selepas Publish</label>
   <button type="button" disabled={busy} className="tf-btn" onClick={()=>void saveDetails()}><Save size={15}/> Simpan Penerangan</button>
   </div><div className="tf-gallery-upload">
   <div className="tf-gallery-upload-icon"><ImagePlus size={28}/></div><h4>Tambah gambar hasil kerja</h4><p>Untuk thumbnail portfolio paling menarik, muat naik screenshot halaman utama website dan jadikannya <strong>Cover</strong>. Anda juga boleh tambah gambar halaman lain. JPG/PNG/WebP · Maksimum 5 MB setiap gambar · Sehingga {MAX_PER_PROJECT} gambar.</p>
   <div className={`tf-file-dropzone ${dragActive?"drag-active":""}`} onDragOver={e=>{e.preventDefault();setDragActive(true)}} onDragLeave={e=>{e.preventDefault();setDragActive(false)}} onDrop={e=>{e.preventDefault();setDragActive(false);if(!busy)checkFiles(Array.from(e.dataTransfer.files))}}><input ref={fileInput} id="project-gallery-upload" aria-label="Pilih gambar hasil kerja" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={busy} hidden/><button type="button" className="tf-file-select" disabled={busy} onClick={()=>fileInput.current?.click()}><ImagePlus size={17}/> Pilih Gambar Kerja</button><span>atau seret gambar ke kawasan ini</span></div>
   {!!files.length&&<div className="tf-gallery-selection"><b>{files.length} gambar dipilih</b><div className="tf-file-preview-list">{previews.map((src,i)=><div key={src}><img src={src} alt={files[i]?.name||"Pratonton gambar"}/><small>{files[i]?.name}</small></div>)}</div><div className="tf-file-name-list">{files.map((x,i)=><span key={i}>{x.name} · {(x.size/1024/1024).toFixed(1)} MB</span>)}</div></div>}
   <button type="button" disabled={busy||!files.length} className="tf-btn" onClick={()=>void upload()}><UploadCloud size={15}/>{busy?"Uploading...":"Upload Gambar"}</button>
   </div></div>
   <div className="tf-gallery-privacy"><Camera size={17}/><div><strong>Penting tentang privasi gambar:</strong> fail galeri disimpan dalam storan awam mengikut URL, walaupun projek belum diterbitkan. Hanya tajuk, gambar dan penerangan projek yang anda pilih akan dipaparkan dalam portfolio. Jangan muat naik gambar sulit. Selepas membuat perubahan, tekan <strong>Publish Portfolio</strong> semula.</div></div>
   {notice&&<p role="status" className="tf-gallery-message">{notice}</p>}
   {loading?<p>Memuatkan galeri...</p>:images.length===0?<div className="tf-gallery-empty"><Images size={29}/><b>Tiada gambar lagi</b><span>Tambah gambar kerja pertama untuk projek ini.</span></div>:
   <div className="tf-gallery-items">{images.map((im,i)=>{const src=supabase.storage.from(BUCKET).getPublicUrl(im.storage_path).data.publicUrl;return <article key={im.id} className="tf-gallery-item"><div className="tf-gallery-item-photo"><img alt={im.caption||`Gambar ${i+1} projek ${project.title}`} src={src} loading="lazy"/>{im.is_cover&&<span className="tf-gallery-cover"><Star size={13}/> Cover</span>}</div><div className="tf-gallery-item-body"><label>Kapsyen gambar<textarea rows={2} maxLength={500} placeholder="Contoh: Reka bentuk dashboard selepas penambahbaikan..." value={captions[im.id]??im.caption} onChange={e=>setCaptions(prev=>({...prev,[im.id]:e.target.value}))}/></label><div className="tf-gallery-item-actions"><button type="button" title="Simpan kapsyen" disabled={busy} onClick={()=>void saveCaption(im)}><Check size={15}/> Save</button><button type="button" title="Jadikan gambar utama" disabled={busy||im.is_cover} onClick={()=>void cover(im)}><Star size={15}/></button><button type="button" title="Alih ke kiri" disabled={busy||i===0} onClick={()=>void move(im,-1)}><ArrowUp size={15}/></button><button type="button" title="Alih ke kanan" disabled={busy||i===images.length-1} onClick={()=>void move(im,1)}><ArrowDown size={15}/></button><button type="button" title="Padam gambar" disabled={busy} onClick={()=>setPendingDeletion(im)}><Trash2 size={15}/></button></div></div></article>})}</div>}
   </>}
 <ConfirmDialog
  open={pendingDeletion!==null}
  title="Padam gambar projek?"
  description="Foto ini bersama kapsyen akan dipadam secara kekal daripada galeri."
  confirmLabel="Padam Gambar"
  danger busy={busy}
  onClose={()=>setPendingDeletion(null)}
  onConfirm={()=>void removeConfirmed()}
 />
 </section>;
}

````

## 5. `components/profile-photo-editor.tsx`

````tsx
"use client";
import { useEffect,useMemo,useRef,useState } from "react";
import { Camera,CheckCircle2,Trash2,UploadCloud,UserRound } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import ConfirmDialog from "@/components/confirm-dialog";

const bucket="profile-photos";
const MAX=2*1024*1024;
export default function ProfilePhotoEditor({userId,url,onChange}:{userId:string;url:string;onChange:(url:string)=>void}){
 const client=useMemo(()=>getSupabaseClient(),[]);
 const input=useRef<HTMLInputElement>(null);
 const [preview,setPreview]=useState(""),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [pendingDelete,setPendingDelete]=useState(false);
 useEffect(()=>{if(!file){setPreview("");return;}const objectUrl=URL.createObjectURL(file);setPreview(objectUrl);return()=>URL.revokeObjectURL(objectUrl)},[file]);
 const trustedPrefix=`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${userId}/`;
 function oldPath(){if(!url.startsWith(trustedPrefix))return null;return decodeURIComponent(url.slice(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/`.length));}
 async function upload(){
  if(!file)return;
  setBusy(true);setMessage("");
  try{
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path=`${userId}/${crypto.randomUUID()}.${ext}`;
   const {error:uploadError}=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   const newUrl=client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
   const {error:saveError}=await client.from("profiles").upsert({user_id:userId,avatar_url:newUrl,updated_at:new Date().toISOString()},{onConflict:"user_id"});
   if(saveError){await client.storage.from(bucket).remove([path]);throw saveError;}
   const previous=oldPath();
   if(previous&&previous!==path)await client.storage.from(bucket).remove([previous]);
   onChange(newUrl);setFile(null);if(input.current)input.current.value="";
   setMessage("Gambar profil berjaya dikemas kini.");
  }catch(e){setMessage(e instanceof Error?e.message:"Upload gagal.")}
  finally{setBusy(false)}
 }
 async function remove(){
  if(!url)return;
  setPendingDelete(false);
  setBusy(true);setMessage("");
  try{
   const previous=oldPath();
   const {error}=await client.from("profiles").update({avatar_url:"",updated_at:new Date().toISOString()}).eq("user_id",userId);
   if(error)throw error;
   if(previous){const {error:storageError}=await client.storage.from(bucket).remove([previous]);if(storageError)setMessage("Profil dikemas kini; fail lama mungkin masih tersedia: "+storageError.message);}
   onChange("");setFile(null);if(input.current)input.current.value="";
   if(!previous)setMessage("Gambar profil telah dibuang.");
  }catch(e){setMessage(e instanceof Error?e.message:"Tidak dapat membuang gambar.")}
  finally{setBusy(false)}
 }
 function selectFile(value:File|null){
  setMessage("");
  if(!value){setFile(null);return;}
  if(!["image/png","image/jpeg","image/webp"].includes(value.type)){setMessage("Pilih imej JPG, PNG atau WebP sahaja.");return;}
  if(value.size>MAX){setMessage("Gambar mesti kurang daripada 2 MB.");return;}
  setFile(value);
 }
 return <section className="tf-card tf-photo-editor">
  <div className="tf-card-head"><div><h3>Profile Photo</h3><p>Gambar profesional yang dipaparkan pada portfolio anda</p></div><span className="tf-pill"><Camera size={13}/> Avatar</span></div>
  <div className="tf-photo-editor-main"><div className="tf-photo-avatar">
  {(preview||url)?<img src={preview||url} alt="Pratonton gambar profil" referrerPolicy="no-referrer"/>:<UserRound size={51}/>}
  <button type="button" disabled={busy} onClick={()=>input.current?.click()} aria-label="Pilih gambar profil"><Camera size={16}/></button></div>
  <div className="tf-photo-action"><h4>Make a great first impression.</h4><p>Upload gambar muka yang jelas. JPG, PNG atau WebP, maksimum 2 MB.</p>
  <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>selectFile(e.target.files?.[0]||null)} className="tf-visually-hidden"/>
  <div className="tf-form-actions"><button className="tf-btn tf-btn-outline" disabled={busy} type="button" onClick={()=>input.current?.click()}><UploadCloud size={16}/> Pilih Gambar</button>
  {file&&<button className="tf-btn" disabled={busy} onClick={()=>void upload()}><CheckCircle2 size={16}/> Simpan Gambar</button>}
  {url&&<button className="tf-btn tf-btn-outline" disabled={busy} onClick={()=>setPendingDelete(true)}><Trash2 size={15}/> Buang</button>}</div>
  </div></div><p className="tf-photo-privacy">Perhatian: gambar disimpan dalam storan awam untuk paparan portfolio. Jangan muat naik gambar sensitif. Penerbitan portfolio tetap dikawal secara berasingan.</p>
  {message&&<p className="tf-hint" role="status">{message}</p>}
 <ConfirmDialog
  open={pendingDelete}
  title="Padam gambar profil?"
  description="Gambar profil akan dibuang daripada akaun anda. Portfolio yang telah diterbitkan masih memerlukan penerbitan semula."
  confirmLabel="Padam Foto"
  danger busy={busy}
  onClose={()=>setPendingDelete(false)}
  onConfirm={()=>void remove()}
 />
 </section>
}

````

## 6. `components/ai-skills-analysis.tsx`

````tsx
"use client";
import {useMemo,useState,useEffect} from "react";
import {BrainCircuit,Copy,Sparkles,KeyRound,Plus,Trash2,Eye,EyeOff,ShieldCheck,AlertTriangle,RotateCcw,CheckCircle2,LockKeyhole,Save,Unlock,ShieldOff} from "lucide-react";
import Link from "next/link";
import {getSupabaseClient} from "@/lib/supabase";
import CareerReport from "@/components/career-report";
import ConfirmDialog from "@/components/confirm-dialog";
import {parseCareerReport} from "@/lib/career-report";
import { GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from "@/lib/gemini-models";
import {encryptVault,decryptVault,vaultStorageKey,type VaultEnvelope} from "@/lib/gemini-key-vault";
type Entry={id:number;label:string;secret:string;visible:boolean};
type Attempt={slot:number;status:string;httpStatus?:number;retryCount?:number};
const MAX_KEYS=5;

export default function AIAnalysis({role,skills}:{role:string;skills:{name:string;self_rating:number|null}[]}){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [keys,setKeys]=useState<Entry[]>([{id:1,label:"Gemini Key 1",secret:"",visible:false}]);
 const [model,setModel]=useState<string>(DEFAULT_GEMINI_MODEL),[consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false),[result,setResult]=useState(""),[error,setError]=useState("");
 const [attempts,setAttempts]=useState<Attempt[]>([]),[usedSlot,setUsedSlot]=useState<number|null>(null),[copied,setCopied]=useState(false);
 const [vaultOwner,setVaultOwner]=useState<string|null>(null);
 const [vaultExists,setVaultExists]=useState(false),[vaultPassphrase,setVaultPassphrase]=useState(""),[vaultBusy,setVaultBusy]=useState(false),[vaultMessage,setVaultMessage]=useState("");
 const [confirmVaultDeletion,setConfirmVaultDeletion]=useState(false);
 useEffect(()=>{let live=true;void db.auth.getUser().then(({data})=>{
  if(!live)return;
  const id=data.user?.id||null;setVaultOwner(id);
  if(id){try{setVaultExists(localStorage.getItem(vaultStorageKey(id))!==null)}catch{setVaultMessage("Storan peranti tidak tersedia. Gunakan key dalam sesi sahaja.");}}
 });return()=>{live=false}},[db]);
 async function saveVault(){
  if(!vaultOwner){setVaultMessage("Log masuk untuk menyimpan key secara peribadi.");return;}
  if(vaultPassphrase.length<12){setVaultMessage("Gunakan kata laluan vault sekurang-kurangnya 12 aksara.");return;}
  setVaultBusy(true);setVaultMessage("");
  try{
   const filled=keys.filter(k=>k.secret.trim()).map(k=>({label:k.label.trim()||"Gemini API Key",secret:k.secret.trim()}));
   const encrypted=await encryptVault(vaultPassphrase,filled);
   localStorage.setItem(vaultStorageKey(vaultOwner),JSON.stringify(encrypted));
   setVaultExists(true);setVaultPassphrase("");setVaultMessage("✓ API key disimpan secara terenkripsi pada peranti ini. Masukkan kata laluan vault untuk membuka semula selepas refresh.");
  }catch(e){setVaultMessage(e instanceof Error?e.message:"Tidak dapat menyimpan vault.");}
  finally{setVaultBusy(false)}
 }
 async function unlockVault(){
  if(!vaultOwner)return;
  setVaultBusy(true);setVaultMessage("");
  try{
   const raw=localStorage.getItem(vaultStorageKey(vaultOwner));
   if(!raw)throw Error("Tiada key tersimpan pada peranti ini.");
   const restored=await decryptVault(vaultPassphrase,JSON.parse(raw) as VaultEnvelope);
   setKeys(restored.map((x,i)=>({id:i+1,label:x.label,secret:x.secret,visible:false})));
   setVaultPassphrase("");setVaultMessage("✓ Semua API key berjaya dibuka. Anda boleh menjalankan analisis Gemini.");
  }catch{setVaultMessage("Tidak dapat membuka vault. Semak kata laluan, atau padam vault dan simpan key baharu.");}
  finally{setVaultBusy(false)}
 }
 function deleteVault(){
  if(!vaultOwner)return;
  setConfirmVaultDeletion(false);
  try{localStorage.removeItem(vaultStorageKey(vaultOwner));setVaultExists(false);setVaultPassphrase("");setVaultMessage("Vault setempat telah dipadam. Key dalam borang masih ada sehingga refresh.");}
  catch{setVaultMessage("Gagal memadam vault setempat.");}
 }
 const [roundRobin,setRoundRobin]=useState(0);
 const [testing,setTesting]=useState(false),[testMessage,setTestMessage]=useState("");
 const valid=keys.map(k=>k.secret.trim()).filter(s=>s.length>=15);
 const analysisPrompt=`Anda ialah penasihat pembangunan kerjaya di Malaysia. Jawatan sasaran saya: ${role}. Penilaian kemahiran berikut adalah penilaian kendiri sahaja:\n${skills.map(s=>`• ${s.name} — ${s.self_rating??"Belum dinilai"}/5`).join("\n")}\n\nBuat ringkasan kekuatan, matriks jurang kemahiran, roadmap 30/60/90 hari, cadangan projek bukti kerja dan kursus. Jangan reka pengalaman atau sijil; tanya jika data tidak mencukupi. Bahasa Melayu Malaysia.`;
 const change=(id:number,field:"secret"|"label"|"visible",value:string|boolean)=>setKeys(prev=>prev.map(x=>x.id===id?{...x,[field]:value}:x));
 async function analyze(){
  if(!consent||valid.length===0)return;
  setBusy(true);setError("");setResult("");setAttempts([]);setUsedSlot(null);
  try{
   const {data:{session},error:sessionError}=await db.auth.getSession();
   if(sessionError||!session)throw Error("Sesi tidak sah. Sila log masuk semula.");
   const ordered=[...valid.slice(roundRobin%valid.length),...valid.slice(0,roundRobin%valid.length)];
   const response=await fetch("/api/skills/analyze",{
    method:"POST",cache:"no-store",
    headers:{"content-type":"application/json",Authorization:`Bearer ${session.access_token}`},
    body:JSON.stringify({role,apiKeys:ordered,model,consent:true})
   });
   const data=await response.json() as {analysis?:string;complete?:boolean;error?:string;usedKeySlot?:number;attempts?:Attempt[];model?:string};
   setAttempts(data.attempts||[]);
   if(!response.ok)throw Error(data.error||"Gemini tidak dapat menjana analisis.");
   if(!data.complete||!data.analysis||parseCareerReport(data.analysis).sections.length!==5)throw Error("Analisis Gemini tidak lengkap dan tidak akan dieksport. Cuba jana semula.");
   setResult(data.analysis);
   const slot=data.usedKeySlot||1;
   setUsedSlot(((roundRobin+slot-1)%valid.length)+1);
   setRoundRobin(v=>(v+slot)%valid.length);
  }catch(e){setError(e instanceof Error?e.message:"Gagal menghubungi Gemini.");}finally{setBusy(false)}
 }
 async function testConnection(){
  const first=keys.find(k=>k.secret.trim().length>=15);
  if(!first)return;
  setTesting(true);setTestMessage("");
  try{
   const {data:{session}}=await db.auth.getSession();
   if(!session)throw new Error("Sila log masuk semula.");
   const response=await fetch("/api/skills/test-connection",{method:"POST",cache:"no-store",
    headers:{"content-type":"application/json",Authorization:`Bearer ${session.access_token}`},
    body:JSON.stringify({apiKey:first.secret.trim(),model})});
   const data=await response.json() as {message?:string;error?:string;seconds?:number;httpStatus?:number};
   setTestMessage(response.ok?`✓ ${data.message||"Berjaya"} (${data.seconds??0}s)`:
    `✕ ${data.error||"Ujian tidak berjaya."} ${data.httpStatus?"HTTP "+data.httpStatus:""}`);
  }catch(e){setTestMessage(e instanceof Error?e.message:"Ujian sambungan gagal.");}
  finally{setTesting(false)}
 }
 async function copy(text:string){try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setError("Gagal menyalin ke clipboard. Sila semak kebenaran browser.");}}
 return <section className="tf-card tf-section tf-ai-panel">
  <div className="tf-card-head"><div><h3><BrainCircuit size={21}/> Gemini Skills Intelligence</h3><p>Analisis kerjaya menggunakan API Gemini anda sendiri, berdasarkan rekod dalam akaun Talentfolio AI.</p></div><span className="tf-pill"><KeyRound size={13}/> Bring Your Own Key</span></div>
  <div className="tf-gemini-intro"><ShieldCheck size={19}/><p><strong>API key milik pengguna.</strong> Anda boleh memasukkan sehingga 5 key. Secara lalai, key hanya berada dalam memori tab. Anda kini boleh memilih <strong>Simpan Terenkripsi pada Peranti</strong> untuk mengekalkannya selepas refresh atau kemas kini website. Key terenkripsi disimpan dalam browser, bukan Supabase atau GitHub. Kata laluan vault tidak disimpan; anda perlu memasukkannya untuk membuka semula key. Key hanya dihantar melalui HTTPS ke backend semasa panggilan Gemini.</p></div>
  <div className="tf-gemini-heading"><h4>1. Pengurusan Gemini API Key</h4><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Dapatkan API key di Google AI Studio ↗</a></div>
  <p className="tf-gemini-help">Gunakan <strong>satu API key</strong> dahulu. Untuk mendapatkan key, buka Google AI Studio, pilih projek Google Cloud anda, kemudian cipta API key dan tampal di bawah. Pastikan model dan kuota projek membenarkan penggunaan. Key digunakan oleh pelayan semasa analisis; ia tidak disimpan pada pelayan Talentfolio AI.</p>
  <div className="tf-gemini-key-list">{keys.map((k,i)=><div key={k.id} className="tf-gemini-key-row">
   <span className="tf-gemini-index">#{i+1}</span>
   <div className="tf-gemini-key-input"><label htmlFor={`tf-key-${k.id}`}>Label API Key</label><input aria-label="Nama key" value={k.label} maxLength={40} onChange={e=>change(k.id,"label",e.target.value)}/></div>
   <div className="tf-gemini-secret"><label htmlFor={`tf-key-${k.id}`}>Gemini API Key</label><div><input id={`tf-key-${k.id}`} type={k.visible?"text":"password"} autoComplete="off" spellCheck={false} value={k.secret} onChange={e=>change(k.id,"secret",e.target.value)} placeholder="Masukkan key anda secara manual"/><button type="button" aria-label={k.visible?"Sembunyikan key":"Lihat key"} onClick={()=>change(k.id,"visible",!k.visible)}>{k.visible?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>
   <button type="button" title="Buang key" aria-label={`Buang key ${i+1}`} disabled={keys.length===1||busy} onClick={()=>setKeys(prev=>prev.filter(x=>x.id!==k.id))}><Trash2 size={17}/></button>
  </div>)}</div>
  <details className="tf-gemini-advanced">
   <summary><KeyRound size={16}/> Pilihan lanjutan — berbilang API key dan vault terenkripsi</summary>
   <p className="tf-gemini-help">Tambah key tambahan hanya jika benar-benar diperlukan. Banyak key daripada projek yang sama tidak semestinya menambah kuota.</p>
  <div className="tf-gemini-add"><button type="button" className="tf-btn tf-btn-outline" disabled={keys.length>=MAX_KEYS||busy} onClick={()=>setKeys(prev=>[...prev,{id:Math.max(...prev.map(x=>x.id))+1,label:`Gemini Key ${prev.length+1}`,secret:"",visible:false}])}><Plus size={15}/> Tambah API Key ({keys.length}/{MAX_KEYS})</button><small>{valid.length} key telah diisi · Satu key akan digunakan untuk setiap percubaan. Key lain dicuba jika had kuota atau ralat penyedia berlaku.</small></div>
  <div className="tf-gemini-vault">
   <div className="tf-gemini-vault-title"><LockKeyhole size={19}/><div><h4>Simpan API Key (Terenkripsi pada Peranti)</h4><p>{vaultExists?"Vault tersimpan pada browser ini. Ia akan kekal selepas refresh/deployment.":"Belum ada key disimpan. Simpan secara pilihan supaya tidak perlu tampal semula setiap kali."}</p></div></div>
   <p className="tf-gemini-vault-note">Key disulitkan dengan AES-GCM dan kata laluan pilihan anda. Storan ini hanya tersedia pada browser/peranti dan akaun yang sama. Jika anda memadam data browser, bertukar peranti atau terlupa kata laluan, key tidak dapat dipulihkan daripada vault. Jangan gunakan peranti awam.</p>
   <label className="tf-gemini-vault-input">Kata laluan vault (minimum 12 aksara)<input type="password" autoComplete="new-password" minLength={12} value={vaultPassphrase} onChange={e=>setVaultPassphrase(e.target.value)} placeholder="Kata laluan khusus untuk melindungi key"/></label>
   <div className="tf-gemini-vault-actions"><button type="button" className="tf-btn" disabled={!vaultOwner||vaultBusy||!valid.length||vaultPassphrase.length<12} onClick={()=>void saveVault()}><Save size={15}/>{vaultBusy?"Memproses...":"Simpan Key Terenkripsi"}</button>
    {vaultExists&&<button type="button" className="tf-btn tf-btn-outline" disabled={vaultBusy||vaultPassphrase.length===0} onClick={()=>void unlockVault()}><Unlock size={15}/>Buka Key Tersimpan</button>}
    {vaultExists&&<button type="button" className="tf-btn tf-btn-outline" disabled={vaultBusy} onClick={()=>setConfirmVaultDeletion(true)}><ShieldOff size={15}/>Padam Vault</button>}
   </div>
   {vaultMessage&&<p role="status" className="tf-gemini-vault-message">{vaultMessage}</p>}
  </div>
  </details>
  <div className="tf-gemini-settings"><div><h4>2. Pilihan model & sasaran</h4><p>Jawatan sasaran: <strong>{role}</strong></p></div><label>Model Gemini<select value={model} onChange={e=>setModel(e.target.value)} disabled={busy}>{GEMINI_MODELS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label></div>
  <div className="tf-gemini-quota"><AlertTriangle size={18}/><p><strong>Kuota tidak semestinya bertambah dengan banyak key.</strong> Google menetapkan kebanyakan had penggunaan mengikut projek Google Cloud, bukan setiap key. Jika semua key daripada projek sama, bertukar key mungkin tidak menyelesaikan had kuota. Pastikan penggunaan setiap key mematuhi polisi Google dan tetapan billing anda.</p></div>
  <label className="tf-ai-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Saya faham API key saya akan dihantar ke pelayan Talentfolio AI untuk panggilan Gemini, dan data kemahiran, projek, pendidikan, pengalaman serta nama sijil saya akan dihantar kepada Google untuk dianalisis. Saya bersetuju meneruskan.</label>
  <div className="tf-gemini-run"><button type="button" className="tf-btn tf-btn-outline" disabled={busy||testing||valid.length===0} onClick={()=>void testConnection()}><KeyRound size={15}/>{testing?"Menguji sambungan...":"Uji Sambungan Gemini"}</button><button className="tf-btn" type="button" disabled={busy||!consent||valid.length===0||skills.length===0} onClick={()=>void analyze()}><Sparkles size={16}/>{busy?"Gemini sedang menganalisis…":"Generate Skills Analysis (Gemini)"}</button><span>{!valid.length?"Masukkan sekurang-kurangnya 1 API key.":!consent?"Tandakan persetujuan sebelum menjana analisis.":"Sedia menjana analisis berdasarkan profil anda."}</span></div>
  {testMessage&&<p role="status" className="tf-hint" style={{marginBottom:15}}>{testMessage}</p>}
  {error&&<div className="tf-ai-error" role="alert">{error}{!!attempts.length&&<ul>{attempts.map(a=><li key={a.slot}>Percubaan key #{a.slot}{a.httpStatus?` · HTTP ${a.httpStatus}`:""}: {a.status}</li>)}</ul>}</div>}
  {result&&<><CareerReport text={result} role={role} model={model} usedSlot={usedSlot} onCopy={()=>void copy(result)}/>{attempts.length>0&&<p className="tf-hint">Key sebelumnya tidak berjaya: {attempts.map(a=>`#${a.slot} (${a.status})`).join(", ")}</p>}</>}
  <div className="tf-gemini-fallback"><div><strong>Tiada API key? Gunakan AI pilihan anda.</strong><p>Anda masih boleh salin prompt analisis profesional dan tampal dalam ChatGPT, Gemini atau Claude tanpa sambungan API pada website.</p></div><button className="tf-btn tf-btn-outline" type="button" onClick={()=>void copy(analysisPrompt)}><Copy size={14}/>{copied?"Disalin":"Salin Prompt Analisis"}</button><Link href="/prompt-generator">Buka Prompt Generator</Link></div>
  <p className="tf-muted">Gemini memberikan cadangan berdasarkan data kendiri; ia tidak mengesahkan sijil atau tahap kemahiran. Setiap panggilan API tertakluk kepada kuota dan caj akaun Google anda.</p>
  <ConfirmDialog
   open={confirmVaultDeletion}
   title="Padam vault API key?"
   description="Semua API key yang disimpan secara terenkripsi pada peranti ini akan dipadam. Key di Google AI Studio tidak akan dibatalkan."
   confirmLabel="Padam Vault"
   danger busy={vaultBusy}
   onClose={()=>setConfirmVaultDeletion(false)}
   onConfirm={deleteVault}
  />
 </section>;
}

````

## 7. `app/page.tsx`

````tsx
import SupportPartners from "@/components/support-partners";
import Link from "next/link";
import { ArrowRight, Award, BriefcaseBusiness, ChartNoAxesCombined, Globe2, ShieldCheck, Sparkles } from "lucide-react";
export default function Home(){return <main className="tf-marketing"><header className="tf-marketing-nav"><Link href="/"><span className="tf-brandicon tf-logo-mark"><img src="/talentfolio-mark.svg" alt="" width="38" height="38"/></span> Talentfolio AI</Link><div className="tf-marketing-links"><a href="#features" className="tf-hide-mobile">Features</a><Link href="/auth">Log masuk</Link><Link className="tf-btn" href="/auth">Get Started <ArrowRight size={15}/></Link></div></header><section className="tf-marketing-hero"><small>✦ YOUR SKILLS DESERVE TO BE SEEN</small><h1>Your story. Your skills.<br/><em>Your next opportunity.</em></h1><p>One beautiful workspace to manage achievements, showcase your best work, organize certificates and discover what to learn next. Dibina untuk pelajar dan pekerja yang mahu lebih maju.</p><div className="tf-marketing-actions"><Link className="tf-btn" href="/auth">Build My Portfolio <ArrowRight size={16}/></Link><a className="tf-btn tf-btn-outline" href="#features">Lihat Ciri Platform <Globe2 size={16}/></a></div></section><SupportPartners variant="landing"/><section className="tf-marketing-grid" id="features">{[[Globe2,"Beautiful Digital Portfolio","Bina halaman portfolio profesional dengan template moden dan pautan yang boleh dikongsi."],[Award,"Secure Certificate Vault","Simpan fail kelayakan dalam storan peribadi. Anda kawal siapa yang boleh melihatnya."],[ChartNoAxesCombined,"Skills & Career Insights","Lihat jurang kemahiran melalui penilaian kendiri dan pelan pembangunan praktikal."],[BriefcaseBusiness,"Project Showcase","Susun projek sebenar dan tampilkan yang terbaik kepada bakal majikan."],[ShieldCheck,"Privacy by Design","Data peribadi dilindungi oleh kawalan akses dan hanya diterbitkan selepas anda memilih."],[Sparkles,"Grow Every Day","Kemas kini pencapaian dan perkembangan anda dalam satu ruang kerja."]].map(([Icon,name,desc])=>{const I=Icon as typeof Globe2;return <article key={String(name)} className="tf-marketing-feature"><I size={24}/><h3>{String(name)}</h3><p>{String(desc)}</p></article>})}</section><footer className="tf-landing-footer"><div className="tf-landing-footer-brand"><strong>Talentfolio AI</strong><span>Portfolio · Skills · Career Intelligence</span><p>Platform portfolio profesional dan pembangunan kerjaya berasaskan AI.</p><small>© {new Date().getFullYear()} Talentfolio AI.</small></div><SupportPartners variant="footer"/></footer></main>}

````

