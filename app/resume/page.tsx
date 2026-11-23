"use client";
import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { ArrowLeft,FileDown,FileUser,Printer,ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
type Profile={display_name:string;headline:string;bio:string;location:string;website:string};
type Project={id:string;title:string;description:string;url:string|null};
type Skill={id:string;name:string;self_rating:number};
export default function Resume(){
 const client=useMemo(()=>getSupabaseClient(),[]),[loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[error,setError]=useState("");
 const [profile,setProfile]=useState<Profile>({display_name:"",headline:"",bio:"",location:"",website:""}),[projects,setProjects]=useState<Project[]>([]),[skills,setSkills]=useState<Skill[]>([]);
 useEffect(()=>{let mounted=true;(async()=>{try{const {data,error}=await client.auth.getUser();if(error)throw error;if(!mounted)return;if(!data.user){setSignedIn(false);return}setSignedIn(true);
 const [p,j,s]=await Promise.all([client.from("profiles").select("display_name,headline,bio,location,website").eq("user_id",data.user.id).maybeSingle(),client.from("projects").select("id,title,description,url").eq("user_id",data.user.id).order("created_at",{ascending:false}),client.from("skills").select("id,name,self_rating").eq("user_id",data.user.id)]);
 if(p.error||j.error||s.error)throw Error(p.error?.message||j.error?.message||s.error?.message);
 if(mounted){if(p.data)setProfile(p.data as Profile);setProjects((j.data||[]) as Project[]);setSkills((s.data||[]) as Skill[]);}
 }catch(e){if(mounted)setError(e instanceof Error?e.message:"Tidak dapat memuatkan CV")}finally{if(mounted)setLoading(false)}})();return()=>{mounted=false}},[client]);
 return <main className="tf-resume-page"><div className="tf-resume-toolbar"><Link href="/dashboard" className="tf-btn tf-btn-outline"><ArrowLeft size={16}/> Workspace</Link><b><FileUser size={19}/> Resume Builder</b><button className="tf-btn" disabled={loading||!signedIn} onClick={()=>window.print()}><Printer size={16}/> Print / Save as PDF</button></div>
 {loading?<div className="tf-resume-message">Memuatkan CV...</div>:!signedIn?<div className="tf-resume-message"><p>Sila log masuk untuk menghasilkan CV daripada profil anda.</p><Link className="tf-btn" href="/auth">Log masuk</Link></div>:error?<div className="tf-resume-message">{error}</div>:
 <><div className="tf-resume-guidance"><FileDown size={18}/> Gunakan fungsi Print dan pilih “Save as PDF”. Pastikan maklumat profil dan projek tepat sebelum berkongsi.</div>
 <article className="tf-resume-sheet"><div className="tf-resume-head"><div><h1>{profile.display_name||"Nama anda"}</h1><p>{profile.headline||"Professional Profile"}</p></div><div className="tf-resume-monogram">{(profile.display_name||"T").slice(0,2).toUpperCase()}</div></div><div className="tf-resume-contact">{profile.location&&<span>📍 {profile.location}</span>}{profile.website&&<span>{profile.website}</span>}</div>
 <section><h2>PROFESSIONAL SUMMARY</h2><p>{profile.bio||"Lengkapkan bahagian About Me di My Profile untuk memaparkan ringkasan profesional anda."}</p></section>
 {skills.length>0&&<section><h2>CORE SKILLS</h2><div className="tf-resume-chips">{skills.map(s=><span key={s.id}>{s.name}</span>)}</div><small>Skills listed are self-reported.</small></section>}
 {projects.length>0&&<section><h2>SELECTED PROJECTS</h2>{projects.map(p=><div className="tf-resume-project" key={p.id}><h3>{p.title}</h3><p>{p.description}</p>{p.url&&<small>{p.url}</small>}</div>)}</section>}
 <footer><ShieldCheck size={14}/> Generated from your Talentfolio AI profile. Review before submitting.</footer></article></>}
 </main>;
}
