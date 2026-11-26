"use client";
import {useState} from "react";
import {Plus,Save,Building2} from "lucide-react";
import {getSupabaseClient} from "@/lib/supabase";
type Programme={id:string;name:string;code:string};
type Cohort={id:string;name:string;programme_id:string};
export default function InstitutionAdmin({institutionId,userId,programmes,cohorts,onSaved}:{institutionId:string;userId:string;programmes:Programme[];cohorts:Cohort[];onSaved:(message:string)=>void}){
 const [programme,setProgramme]=useState(""),[name,setName]=useState(""),[code,setCode]=useState("");
 const [cohort,setCohort]=useState(""),[cohortName,setCohortName]=useState(""),[parent,setParent]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 function selectProgramme(id:string){const p=programmes.find(x=>x.id===id);setProgramme(p?.id||"");setName(p?.name||"");setCode(p?.code||"");setError("")}
 function selectCohort(id:string){const c=cohorts.find(x=>x.id===id);setCohort(c?.id||"");setCohortName(c?.name||"");setParent(c?.programme_id||"");setError("")}
 async function save(kind:"programme"|"cohort"){
  if(busy)return;
  setBusy(true);setError("");
  try{
   const db=getSupabaseClient();
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||user?.id!==userId)throw Error("Sesi tidak sah. Log masuk semula.");
   if(kind==="programme"){
    const n=name.trim(),c=code.trim().toUpperCase();
    if(!n||n.length>160||!c||c.length>40)throw Error("Nama dan kod program tidak sah.");
    if(programme&&!programmes.some(p=>p.id===programme))throw Error("Program tidak tersedia.");
    const result=programme?await db.from("institution_programmes").update({name:n,code:c}).eq("institution_id",institutionId).eq("id",programme).select("id").single():await db.from("institution_programmes").insert({institution_id:institutionId,name:n,code:c}).select("id").single();
    if(result.error||!result.data)throw Error(result.error?.code==="23505"?"Kod program sudah digunakan.":"Program tidak dapat disimpan. Semak keahlian admin dan cuba semula.");
    onSaved("Program berjaya disimpan.");
   }else{
    const n=cohortName.trim();
    if(!n||n.length>120||!programmes.some(p=>p.id===parent))throw Error("Nama kelas atau program tidak sah.");
    if(cohort&&!cohorts.some(c=>c.id===cohort&&c.programme_id===parent))throw Error("Kelas tidak tersedia.");
    const result=cohort?await db.from("institution_cohorts").update({name:n}).eq("institution_id",institutionId).eq("id",cohort).select("id").single():await db.from("institution_cohorts").insert({institution_id:institutionId,programme_id:parent,name:n}).select("id").single();
    if(result.error||!result.data)throw Error("Kelas tidak dapat disimpan. Semak keahlian admin dan cuba semula.");
    onSaved("Kelas berjaya disimpan.");
   }
  }catch(e){setError(e instanceof Error?e.message:"Perubahan tidak dapat disimpan.")}
  finally{setBusy(false)}
 }
 return <section className="tf-career-studio" aria-labelledby="tf-institution-admin-title" style={{marginTop:22}}>
  <div className="tf-career-header"><div><div className="tf-eyebrow">INSTITUTION ADMIN</div><h2 id="tf-institution-admin-title">Pengurusan Program & Kelas</h2><p>Cipta dan kemas kini program atau nama kelas dalam institusi aktif. Tiada fungsi padam atau pindah rekod.</p></div><span className="tf-pill"><Building2 size={15}/> Admin sahaja</span></div>
  <div className="tf-career-grid">
   <section className="tf-career-tile" aria-labelledby="tf-programme-form-title"><h3 id="tf-programme-form-title">Program pengajian</h3>
    <form className="tf-form" onSubmit={e=>{e.preventDefault();void save("programme")}}>
     <fieldset className="tf-coach-fields" disabled={busy}>
      <label htmlFor="tf-admin-programme">Pilih program untuk disunting</label><select id="tf-admin-programme" value={programme} onChange={e=>selectProgramme(e.target.value)}><option value="">Program baharu</option>{programmes.map(p=><option value={p.id} key={p.id}>{p.code} — {p.name}</option>)}</select>
      <label htmlFor="tf-admin-programme-name">Nama program</label><input id="tf-admin-programme-name" required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/>
      <label htmlFor="tf-admin-programme-code">Kod program</label><input id="tf-admin-programme-code" required maxLength={40} value={code} onChange={e=>setCode(e.target.value)}/>
      <button type="submit" className="tf-btn">{programme?<Save size={16}/>:<Plus size={16}/>} {programme?"Simpan program":"Cipta program"}</button>
     </fieldset>
    </form>
   </section>
   <section className="tf-career-tile" aria-labelledby="tf-cohort-form-title"><h3 id="tf-cohort-form-title">Kelas pengajian</h3>
    <form className="tf-form" onSubmit={e=>{e.preventDefault();void save("cohort")}}>
     <fieldset className="tf-coach-fields" disabled={busy||!programmes.length}>
      <label htmlFor="tf-admin-cohort">Pilih kelas untuk disunting</label><select id="tf-admin-cohort" value={cohort} onChange={e=>selectCohort(e.target.value)}><option value="">Kelas baharu</option>{cohorts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <label htmlFor="tf-admin-cohort-parent">Program bagi kelas</label><select id="tf-admin-cohort-parent" required disabled={Boolean(cohort)} value={parent} onChange={e=>setParent(e.target.value)}><option value="">Pilih program</option>{programmes.map(p=><option value={p.id} key={p.id}>{p.code} — {p.name}</option>)}</select>
      <label htmlFor="tf-admin-cohort-name">Nama kelas</label><input id="tf-admin-cohort-name" required maxLength={120} value={cohortName} onChange={e=>setCohortName(e.target.value)}/>
      <button type="submit" className="tf-btn">{cohort?<Save size={16}/>:<Plus size={16}/>} {cohort?"Simpan kelas":"Cipta kelas"}</button>
     </fieldset>
    </form>{!programmes.length&&<p>Cipta program terlebih dahulu.</p>}
   </section>
  </div>
  {busy&&<p role="status">Menyimpan perubahan...</p>}{error&&<p role="alert" className="tf-career-error">{error}</p>}
 </section>
}
