"use client";
import {useEffect,useMemo,useState} from "react";
import {Building2,GraduationCap,Users,ShieldCheck} from "lucide-react";
import {getSupabaseClient} from "@/lib/supabase";

type Membership={institution_id:string;role:"institution_admin"|"lecturer"|"student"};
type Institution={id:string;name:string;slug:string};
type Programme={id:string;name:string;code:string};
type Cohort={id:string;name:string;programme_id:string};
type Directory={institutionId:string;programmes:Programme[];cohorts:Cohort[]};
const roleLabel={institution_admin:"Admin Institusi",lecturer:"Pensyarah",student:"Pelajar"};
export default function InstitutionDirectory({userId}:{userId:string}){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [institutions,setInstitutions]=useState<Institution[]>([]);
 const [memberships,setMemberships]=useState<Membership[]>([]);
 const [selected,setSelected]=useState("");
 const [directory,setDirectory]=useState<Directory|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[directoryError,setDirectoryError]=useState("");
 const [retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError("");setSelected("");setDirectory(null);setInstitutions([]);setMemberships([]);
  void (async()=>{try{
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||user?.id!==userId)throw Error("Sesi tidak sah.");
   const [m,i]=await Promise.all([
    db.from("institution_memberships").select("institution_id,role").eq("user_id",userId).eq("status","active"),
    db.from("institutions").select("id,name,slug").eq("status","active").order("name")
   ]);
   if(m.error||i.error)throw Error("Direktori institusi belum tersedia atau sambungan gagal.");
   if(!active)return;
   const own=(m.data||[]) as Membership[];
   const visible=((i.data||[]) as Institution[]).filter(row=>own.some(x=>x.institution_id===row.id));
   setMemberships(own);setInstitutions(visible);setSelected(visible[0]?.id||"");
  }catch(e){if(active)setError(e instanceof Error?e.message:"Tidak dapat memuatkan institusi.")}
  finally{if(active)setLoading(false)}})();
  return()=>{active=false}
 },[db,userId,retry]);
 useEffect(()=>{let active=true;setDirectory(null);setDirectoryError("");
  if(!selected)return;
  void (async()=>{try{
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||user?.id!==userId)throw Error("Sesi tidak sah.");
   const [p,c,i]=await Promise.all([
    db.from("institution_programmes").select("id,name,code").eq("institution_id",selected).order("name"),
    db.from("institution_cohorts").select("id,name,programme_id").eq("institution_id",selected).order("name"),
    db.from("institutions").select("id").eq("id",selected).maybeSingle()
   ]);
   if(p.error||c.error||i.error||!i.data)throw Error("Akses institusi tidak tersedia. Muat semula keahlian.");
   if(active)setDirectory({institutionId:selected,programmes:(p.data||[]) as Programme[],cohorts:(c.data||[]) as Cohort[]});
  }catch(e){if(active)setDirectoryError(e instanceof Error?e.message:"Direktori gagal dimuatkan.")}})();
  return()=>{active=false}
 },[db,userId,selected,retry]);
 const current=institutions.find(i=>i.id===selected);
 const membership=memberships.find(m=>m.institution_id===selected);
 const shown=directory?.institutionId===selected?directory:null;
 return <section className="tf-card tf-section tf-career-studio" aria-labelledby="tf-institution-title">
  <div className="tf-career-header"><div><div className="tf-eyebrow">TVET INSTITUTION · PHASE 6A</div><h1 id="tf-institution-title">Institution Workspace</h1><p>Direktori institusi, program dan kelas mengikut keahlian aktif anda.</p></div><span className="tf-pill"><ShieldCheck size={15}/> Baca sahaja</span></div>
  {loading?<p role="status">Memuatkan keahlian...</p>:error?<p role="alert" className="tf-career-error">{error}</p>:!institutions.length?<div className="tf-career-tile"><Building2 size={25}/><h3>Tiada keahlian institusi aktif</h3><p>Ruang peribadi anda kekal tersedia. Keahlian institusi perlu diberikan oleh pengendali yang diberi kuasa.</p></div>:<>
   <div className="tf-form tf-career-tile"><label htmlFor="tf-institution-select">Institusi aktif</label><select id="tf-institution-select" value={selected} onChange={e=>setSelected(e.target.value)}>{institutions.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><p>{current?.name} · {membership?roleLabel[membership.role]:""}</p></div>
   {directoryError?<p role="alert" className="tf-career-error">{directoryError}</p>:!shown?<p role="status">Memuatkan program dan kelas...</p>:<div className="tf-career-grid" style={{marginTop:16}}>
    <section className="tf-career-tile" aria-label="Program dibenarkan"><span className="tf-career-icon"><GraduationCap size={21}/></span><h3>Program ({shown.programmes.length})</h3>{shown.programmes.length?shown.programmes.map(p=><p key={p.id}><b>{p.code}</b> — {p.name}</p>):<p>Tiada program diperuntukkan.</p>}</section>
    <section className="tf-career-tile" aria-label="Kelas dibenarkan"><span className="tf-career-icon"><Users size={21}/></span><h3>Kelas ({shown.cohorts.length})</h3>{shown.cohorts.length?shown.cohorts.map(c=><p key={c.id}><b>{c.name}</b> · {shown.programmes.find(p=>p.id===c.programme_id)?.code||"Program"}</p>):<p>Tiada kelas diperuntukkan.</p>}</section>
   </div>}
  </>}
  <button className="tf-career-secondary" type="button" disabled={loading} onClick={()=>setRetry(v=>v+1)}>Muat semula keahlian</button>
  <p className="tf-career-note"><ShieldCheck size={16}/> Peranan ditentukan oleh keahlian pangkalan data. Tiada pengubahan peranan, pengurusan pelajar atau akses kepada portfolio peribadi melalui direktori ini.</p>
 </section>
}
