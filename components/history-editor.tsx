"use client";
import { useEffect,useMemo,useState,type FormEvent } from "react";
import { Award,BriefcaseBusiness,GraduationCap,Plus,Trash2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type Education={id:string;institution:string;qualification:string;field_of_study:string;start_year:number|null;end_year:number|null;description:string};
type Work={id:string;company:string;role:string;start_date:string|null;end_date:string|null;description:string};
type Kind="education"|"experience";
const initialEdu={institution:"",qualification:"",field_of_study:"",start_year:"",end_year:"",description:""};
const initialWork={company:"",role:"",start_date:"",end_date:"",description:""};
export default function HistoryEditor({kind,userId}:{kind:Kind;userId:string}){
 const client=useMemo(()=>getSupabaseClient(),[]),[education,setEducation]=useState<Education[]>([]),[experience,setExperience]=useState<Work[]>([]);
 const [edu,setEdu]=useState(initialEdu),[work,setWork]=useState(initialWork),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const table=kind==="education"?"education":"work_experience";
 async function load(){
  const {data,error}=await client.from(table).select("*").eq("user_id",userId).order("created_at",{ascending:false});
  if(error)throw error;
  if(kind==="education")setEducation((data||[]) as Education[]);else setExperience((data||[]) as Work[]);
 }
 useEffect(()=>{let live=true;(async()=>{try{const {data,error}=await client.from(table).select("*").eq("user_id",userId).order("created_at",{ascending:false});if(error)throw error;if(live){if(kind==="education")setEducation((data||[]) as Education[]);else setExperience((data||[]) as Work[])}}catch(e){if(live)setMessage(e instanceof Error?e.message:"Gagal memuatkan rekod")}})();return()=>{live=false}},[client,kind,table,userId]);
 async function run(fn:()=>Promise<void>){setBusy(true);setMessage("");try{await fn();await load();setMessage("Rekod berjaya disimpan.")}catch(e){setMessage(e instanceof Error?e.message:"Ralat simpanan")}finally{setBusy(false)}}
 async function save(e:FormEvent){e.preventDefault();await run(async()=>{
  if(kind==="education"){
    const {error}=await client.from("education").insert({user_id:userId,institution:edu.institution.trim(),qualification:edu.qualification.trim(),field_of_study:edu.field_of_study.trim(),start_year:edu.start_year?Number(edu.start_year):null,end_year:edu.end_year?Number(edu.end_year):null,description:edu.description.trim()});
    if(error)throw error;
  }else{
    const {error}=await client.from("work_experience").insert({user_id:userId,company:work.company.trim(),role:work.role.trim(),start_date:work.start_date||null,end_date:work.end_date||null,description:work.description.trim()});
    if(error)throw error;
  }
  if(kind==="education")setEdu(initialEdu);else setWork(initialWork);
 })}
 async function remove(id:string){if(!confirm("Padam rekod ini?"))return;await run(async()=>{const {error}=await client.from(table).delete().eq("id",id).eq("user_id",userId);if(error)throw error})}
 const icon=kind==="education"?GraduationCap:BriefcaseBusiness;const Icon=icon;
 const items=kind==="education"?education:experience;
 return <><div className="tf-headingrow"><div><div className="tf-eyebrow">YOUR PROFESSIONAL JOURNEY</div><h1>{kind==="education"?"Education History":"Work Experience"}</h1><p>{kind==="education"?"Rekod kelulusan dan pembelajaran anda.":"Rekod pekerjaan, tanggungjawab dan pengalaman sebenar."}</p></div><span className="tf-pill"><Icon size={15}/> {items.length} records</span></div>
 <div className="tf-two"><form className="tf-card tf-section tf-form" onSubmit={save}><div className="tf-card-head"><h3>{kind==="education"?"Add Education":"Add Experience"}</h3><Plus size={18}/></div>
 {kind==="education"?<>
 <label>Institusi<input required maxLength={180} value={edu.institution} onChange={e=>setEdu({...edu,institution:e.target.value})} placeholder="Contoh: Politeknik ..."/></label>
 <label>Kelayakan / Sijil<input required maxLength={180} value={edu.qualification} onChange={e=>setEdu({...edu,qualification:e.target.value})} placeholder="Diploma, Ijazah, SKM ..."/></label>
 <label>Bidang pengajian<input maxLength={180} value={edu.field_of_study} onChange={e=>setEdu({...edu,field_of_study:e.target.value})}/></label>
 <div className="tf-formgrid"><label>Tahun mula<input type="number" min="1950" max="2100" value={edu.start_year} onChange={e=>setEdu({...edu,start_year:e.target.value})}/></label><label>Tahun tamat<input type="number" min="1950" max="2100" value={edu.end_year} onChange={e=>setEdu({...edu,end_year:e.target.value})}/></label></div>
 <label>Penerangan<textarea rows={3} maxLength={2000} value={edu.description} onChange={e=>setEdu({...edu,description:e.target.value})}/></label>
 </>:<>
 <label>Nama syarikat / organisasi<input required maxLength={180} value={work.company} onChange={e=>setWork({...work,company:e.target.value})}/></label>
 <label>Jawatan<input required maxLength={180} value={work.role} onChange={e=>setWork({...work,role:e.target.value})}/></label>
 <div className="tf-formgrid"><label>Tarikh mula<input type="date" value={work.start_date} onChange={e=>setWork({...work,start_date:e.target.value})}/></label><label>Tarikh tamat (kosong jika masih bekerja)<input type="date" value={work.end_date} onChange={e=>setWork({...work,end_date:e.target.value})}/></label></div>
 <label>Tanggungjawab dan hasil kerja<textarea rows={5} maxLength={3000} value={work.description} onChange={e=>setWork({...work,description:e.target.value})} placeholder="Terangkan hasil dan impak kerja ..."/></label>
 </>}
 <button className="tf-btn" disabled={busy}><Plus size={15}/> Simpan Rekod</button>{message&&<p role="status" className="tf-hint">{message}</p>}</form>
 <section className="tf-card tf-section"><div className="tf-card-head"><h3>{kind==="education"?"My Education":"Career Timeline"}</h3><span className="tf-pill">PRIVATE DATA</span></div>{items.length===0?<div className="tf-empty"><Icon size={27}/><b>Tiada rekod lagi</b><p>Tambah rekod pertama anda menggunakan borang di sebelah.</p></div>:kind==="education"?education.map(x=><div className="tf-listrow" key={x.id}><div className="tf-list-icon"><Award size={19}/></div><div><b>{x.qualification}</b><p>{x.institution}{x.field_of_study?" · "+x.field_of_study:""}</p><small>{x.start_year||"—"} – {x.end_year||"Kini"}</small>{x.description&&<p>{x.description}</p>}</div><button className="tf-iconbutton" aria-label={`Padam ${x.qualification}`} onClick={()=>void remove(x.id)} disabled={busy}><Trash2 size={17}/></button></div>):experience.map(x=><div className="tf-listrow" key={x.id}><div className="tf-list-icon"><BriefcaseBusiness size={19}/></div><div><b>{x.role}</b><p>{x.company}</p><small>{x.start_date||"—"} – {x.end_date||"Kini"}</small>{x.description&&<p>{x.description}</p>}</div><button className="tf-iconbutton" aria-label={`Padam ${x.role}`} onClick={()=>void remove(x.id)} disabled={busy}><Trash2 size={17}/></button></div>)}</section></div></>;
}
