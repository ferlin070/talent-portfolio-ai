"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import WorkspaceSkeleton from "@/components/workspace-skeleton";
import Link from "next/link";
import SupportPartners from "@/components/support-partners";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe2, FolderKanban, Award, ChartNoAxesCombined, FileUser, GraduationCap, BriefcaseBusiness, UserRound, Sparkles, Menu, X, Plus, LogOut, ExternalLink, UploadCloud, Trash2, Download, CheckCircle2, BookOpen, ArrowRight, ShieldCheck, Settings, Search, Target, Moon, Sun, WandSparkles } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import type {NewTheme} from "@/components/portfolio-themes";
import type {ExpansionTheme} from "@/components/portfolio-expansion";
import type {GalleryImage} from "@/components/project-gallery-editor";

const chunkPlaceholder=()=>(
 <div className="tf-component-loading" role="status">Memuatkan modul...</div>
);
const HistoryEditor=dynamic(()=>import("@/components/history-editor"),{loading:chunkPlaceholder});
const ProfilePhotoEditor=dynamic(()=>import("@/components/profile-photo-editor"),{loading:chunkPlaceholder});
const PublicPortfolioClassic=dynamic(()=>import("@/components/public-portfolio-classic"),{loading:chunkPlaceholder});
const PortfolioThemes=dynamic(()=>import("@/components/portfolio-themes"),{loading:chunkPlaceholder});
const ExpansionThemes=dynamic(()=>import("@/components/portfolio-expansion"),{loading:chunkPlaceholder});
const ProjectGalleryEditor=dynamic(()=>import("@/components/project-gallery-editor"),{loading:chunkPlaceholder});
const SkillEditor=dynamic(()=>import("@/components/skill-editor"),{loading:chunkPlaceholder});
const CareerStudio=dynamic(()=>import("@/components/career-studio"),{loading:chunkPlaceholder});
const AIAnalysis=dynamic(()=>import("@/components/ai-skills-analysis"),{loading:chunkPlaceholder});
const PromptGenerator=dynamic(()=>import("@/components/prompt-generator"),{loading:chunkPlaceholder});
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
 const sidebarRef=useRef<HTMLElement|null>(null);
 const menuButtonRef=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{
  if(!mobile)return;
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const menuTrigger=menuButtonRef.current;
  const priorOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  sidebarRef.current?.querySelector<HTMLButtonElement>(".tf-mobile-close")?.focus();

  function onKeydown(event:KeyboardEvent){
   if(event.key==="Escape"){
    event.preventDefault();
    setMobile(false);
    return;
   }
   if(event.key!=="Tab")return;
   const nodes=Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>(
     'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
   )||[]).filter(node=>node.offsetParent!==null);
   if(!nodes.length)return;
   const first=nodes[0],last=nodes[nodes.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  const desktop=window.matchMedia("(min-width: 841px)");
  const onDesktop=(event:MediaQueryListEvent)=>{if(event.matches)setMobile(false);};
  desktop.addEventListener("change",onDesktop);
  document.addEventListener("keydown",onKeydown);
  return ()=>{
   document.body.style.overflow=priorOverflow;
   desktop.removeEventListener("change",onDesktop);
   document.removeEventListener("keydown",onKeydown);
   if(previous?.isConnected)previous.focus();
   else menuTrigger?.focus();
  };
 },[mobile]);

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
 return <div className={`tf-app ${dashboardTheme==="neumorph"?"tf-neumorph":""}`}><aside id="tf-workspace-sidebar" ref={sidebarRef} className={`tf-sidebar ${mobile?"opened":""}`} role={mobile?"dialog":undefined} aria-modal={mobile?true:undefined} aria-label="Navigasi ruang kerja"><Link href="/" className="tf-brand"><div className="tf-brandicon tf-logo-mark"><img src="/talentfolio-mark.svg" alt="" width="38" height="38"/></div><span>Talentfolio AI<small>YOUR GROWTH WORKSPACE</small></span></Link>
 <button type="button" className="tf-mobile-close" aria-label="Tutup navigasi" onClick={()=>setMobile(false)}><X size={19}/></button>
 <div className="tf-navlabel">WORKSPACE</div><nav aria-label="Halaman ruang kerja">{paths.map(([href,label,Icon])=><Link key={href} onClick={()=>setMobile(false)} href={href} aria-current={pathname===href?"page":undefined} className={pathname===href?"active":""}><Icon size={18}/>{label}</Link>)}</nav>
 <div className="tf-navlabel">DEVELOPMENT</div>
 <div className="tf-side-promo"><span>✦ CAREER GROWTH</span><p>Bina kemahiran, simpan pencapaian dan kongsi portfolio dengan yakin.</p><Link href="/skills">Lihat analisis <ArrowRight size={14}/></Link></div>{section!=="dashboard"&&<SupportPartners variant="dashboard"/>}</aside>
 {mobile&&<button className="tf-mobile-overlay" onClick={()=>setMobile(false)} aria-label="Tutup menu"/>}
 <div className="tf-main"><header className="tf-topbar"><div className="tf-top-left"><button className="tf-menu" ref={menuButtonRef} type="button" onClick={()=>setMobile(!mobile)} aria-controls="tf-workspace-sidebar" aria-expanded={mobile} aria-label={mobile?"Tutup navigasi":"Buka navigasi"}><Menu size={20}/></button><span>Workspace <span style={{color:"#afbacb"}}>/</span> <strong>{pageTitle}</strong></span></div>
 <div className="tf-top-right"><button type="button" className="tf-theme-toggle" aria-label={dark?"Aktifkan light mode":"Aktifkan dark mode"} title={dark?"Light Mode":"Dark Mode"} onClick={toggleDark}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button><span className="tf-online"><span/> Personal workspace</span><Link href="/profile" aria-label="Profil" className="tf-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt="Foto profil"/>:username.slice(0,2).toUpperCase()}</Link></div></header>
 <main className="tf-content" id="tf-main-content" tabIndex={-1}>{notice&&protectedNotice}
 {undoProject&&<div className="tf-undo-toast" role="status">
  <span>Projek &ldquo;{undoProject.title}&rdquo; dipadam. Anda boleh memulihkannya dalam 6 saat.</span>
  <button type="button" onClick={()=>void undoProjectDeletion()} disabled={busy}>Buat Asal</button>
 </div>}
 {loading?<WorkspaceSkeleton/>:!userId?<div className="tf-signedout"><div className="tf-brandicon tf-logo-mark"><img src="/talentfolio-mark.svg" alt="" width="38" height="38"/></div><h1>Ruang kerja profesional anda</h1><p>Daftar atau log masuk untuk menyimpan profil, sijil, projek dan kemahiran secara selamat.</p><Link className="tf-btn" href="/auth">Daftar / Log masuk <ArrowRight size={16}/></Link><Link href="/" className="tf-link">Lihat laman utama</Link></div>:<>
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
 <CareerStudio key={`${desired.id}:${JSON.stringify(gaps)}`} role={desired.title} skills={skills} gaps={gaps}/>
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
     preview
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
