"use client";
import {useEffect,useMemo,useState} from "react";
import {CalendarCheck,ShieldCheck,Save,MessageSquareText} from "lucide-react";
import {getSupabaseClient} from "@/lib/supabase";
import {buildGrowthPlan,type CareerGap} from "@/lib/career-studio";
type Status="not_started"|"in_progress"|"completed";
type Day=30|60|90;
type Entry={milestone_day:Day;status:Status;evidence_note:string;mentor_note:string;next_action:string};
const days=[30,60,90] as const;
const blank=(day:Day):Entry=>({milestone_day:day,status:"not_started",evidence_note:"",mentor_note:"",next_action:""});
const statusLabels={not_started:"Belum mula",in_progress:"Sedang berjalan",completed:"Selesai (kendiri)"};
export default function LearningTracker({userId,roleId,role,gaps}:{userId:string;roleId:string;role:string;gaps:CareerGap[]}){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const plan=useMemo(()=>buildGrowthPlan(gaps),[gaps]);
 const [entries,setEntries]=useState<Entry[]>(()=>days.map(blank));
 const [saved,setSaved]=useState<Entry[]>(()=>days.map(blank));
 const [loading,setLoading]=useState(true),[unavailable,setUnavailable]=useState(false),[busy,setBusy]=useState<Day|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setUnavailable(false);setError("");setNotice("");(async()=>{
  try{
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||user?.id!==userId)throw Error("Sesi tidak sah.");
   const {data,error}=await db.from("learning_progress").select("milestone_day,status,evidence_note,mentor_note,next_action").eq("user_id",userId).eq("role_id",roleId);
   if(error)throw Error("Rekod pembelajaran belum tersedia atau sambungan gagal. Cuba lagi selepas pangkalan data dikemas kini.");
   if(!live)return;
   const next=days.map(day=>(data as Entry[]|null)?.find(e=>e.milestone_day===day)??blank(day));
   setEntries(next);setSaved(next);
  }catch(e){if(live){setUnavailable(true);setError(e instanceof Error?e.message:"Tidak dapat memuatkan rekod.")}}
  finally{if(live)setLoading(false)}
 })();return()=>{live=false}},[db,userId,roleId,retry]);
 function change(day:Day,patch:Partial<Entry>){setEntries(old=>old.map(e=>e.milestone_day===day?{...e,...patch}:e));setNotice("");setError("")}
 async function save(entry:Entry){
  if(busy||unavailable||loading)return;
  setBusy(entry.milestone_day);setNotice("");setError("");
  try{
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||user?.id!==userId)throw Error("Sesi tidak sah. Log masuk semula.");
   const payload={...entry,user_id:userId,role_id:roleId,updated_at:new Date().toISOString()};
   const {error}=await db.from("learning_progress").upsert(payload,{onConflict:"user_id,role_id,milestone_day"});
   if(error)throw Error("Tidak dapat menyimpan rekod. Sila cuba lagi.");
   setSaved(old=>old.map(e=>e.milestone_day===entry.milestone_day?{...entry}:e));
   setNotice("Rekod hari "+entry.milestone_day+" disimpan.");
  }catch(e){setError(e instanceof Error?e.message:"Gagal menyimpan.")}
  finally{setBusy(null)}
 }
 const complete=saved.filter(e=>e.status==="completed").length;
 return <section className="tf-career-studio tf-card tf-section" aria-labelledby="tf-learning-title">
  <div className="tf-career-header"><div><div className="tf-eyebrow">CAREER INTELLIGENCE · LEARNING TRACKER</div><h2 id="tf-learning-title">Learning Progress & Mentor Journal</h2><p>Pelan untuk {role}. Rekod kemajuan, bukti kerja dan maklum balas yang diterima di luar aplikasi.</p></div><span className="tf-pill"><ShieldCheck size={15}/> Rekod peribadi</span></div>
  {loading?<p role="status">Memuatkan kemajuan...</p>:unavailable?<div><p role="alert" className="tf-career-error">{error}</p><button type="button" className="tf-career-secondary" onClick={()=>setRetry(v=>v+1)}>Cuba muat semula</button></div>:<>
   <div className="tf-career-result"><strong className="tf-career-score">{complete}/3</strong><p>Milestone ditandakan selesai dan disimpan.</p><progress max={3} value={complete} aria-label="Milestone pembelajaran disimpan"/></div>
   <div className="tf-learning-grid">
   {entries.map(entry=>{
    const day=entry.milestone_day;
    const milestone=plan.milestones.find(m=>m.day===day);
    const dirty=JSON.stringify(entry)!==JSON.stringify(saved.find(e=>e.milestone_day===day));
    return <section className="tf-career-tile" key={day} aria-labelledby={"tf-learn-title-"+day}>
     <span className="tf-career-icon"><CalendarCheck size={21}/></span><h3 id={"tf-learn-title-"+day}>Hari {day} — {milestone?.title}</h3><p>{milestone?.action}</p>
     <form className="tf-form" onSubmit={e=>{e.preventDefault();void save(entry)}}>
      <fieldset disabled={busy!==null} className="tf-coach-fields">
      <label htmlFor={"tf-learn-status-"+day}>Status hari {day}</label><select id={"tf-learn-status-"+day} value={entry.status} onChange={e=>change(day,{status:e.target.value as Status})}>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>
      <label htmlFor={"tf-learn-evidence-"+day}>Bukti pembelajaran hari {day}</label><textarea id={"tf-learn-evidence-"+day} value={entry.evidence_note} maxLength={2000} rows={4} onChange={e=>change(day,{evidence_note:e.target.value})}/>
      <label htmlFor={"tf-learn-mentor-"+day}>Catatan maklum balas mentor hari {day}</label><textarea id={"tf-learn-mentor-"+day} value={entry.mentor_note} maxLength={2000} rows={4} onChange={e=>change(day,{mentor_note:e.target.value})} placeholder="Catat maklum balas yang benar-benar diterima; jangan masukkan data sulit pihak lain."/>
      <label htmlFor={"tf-learn-next-"+day}>Tindakan susulan hari {day}</label><textarea id={"tf-learn-next-"+day} value={entry.next_action} maxLength={500} rows={2} onChange={e=>change(day,{next_action:e.target.value})}/>
      </fieldset>
      <button type="submit" className="tf-btn" disabled={!dirty||busy!==null}><Save size={16}/>{busy===day?"Menyimpan...":"Simpan hari "+day}</button>
      {dirty&&<small>Perubahan belum disimpan.</small>}
     </form>
    </section>
   })}
   </div>
   {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="tf-career-error">{error}</p>}
  </>}
  <p className="tf-career-note"><MessageSquareText size={16}/> Catatan mentor dimasukkan sendiri oleh pengguna, bukan ulasan yang disahkan atau ditulis melalui akaun mentor. Rekod ini tidak diterbitkan dalam portfolio dan tidak dihantar ke Gemini.</p>
 </section>
}
