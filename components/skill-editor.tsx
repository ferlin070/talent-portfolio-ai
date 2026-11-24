"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {Plus,Save,Trash2,Pencil,CheckCircle2,Search} from "lucide-react";
import {getSupabaseClient} from "@/lib/supabase";
type Skill={id:string;name:string;self_rating:number|null;created_at:string};
export default function SkillEditor({userId,skills,onChanged}:{userId:string;skills:Skill[];onChanged:()=>Promise<void>}){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [name,setName]=useState(""),[rating,setRating]=useState(3),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const presets=["Cloud Computing","Web Development","Python","JavaScript","TypeScript","React","Next.js","Supabase","Proxmox","Docker","Networking","Cybersecurity","Database","UI/UX Design","Communication","Leadership"];
 async function save(e:FormEvent){e.preventDefault();if(!name.trim())return;setBusy(true);setNotice("");try{
   const clean=name.trim().replace(/\s+/g," ");if(clean.length>80)throw new Error("Nama kemahiran maksimum 80 aksara.");
   const existing=skills.find(x=>x.name.toLowerCase()===clean.toLowerCase()&&x.id!==editing);
   if(existing)throw new Error("Kemahiran ini sudah wujud. Klik Edit untuk mengubah tahapnya.");
   if(editing){const {data,error}=await db.from("skills").update({name:clean,self_rating:rating}).eq("id",editing).eq("user_id",userId).select("id").single();if(error)throw error;if(!data)throw Error("Rekod tidak dikemas kini.");}
   else{const {data,error}=await db.from("skills").insert({user_id:userId,name:clean,self_rating:rating}).select("id").single();if(error)throw error;if(!data)throw Error("Rekod tidak disimpan.");}
   await onChanged();setName("");setEditing(null);setRating(3);setNotice("Kemahiran berjaya disimpan.");
 }catch(err){setNotice(err instanceof Error?err.message:"Gagal menyimpan kemahiran.");}finally{setBusy(false)}}
 async function remove(id:string){if(!confirm("Padam kemahiran ini?"))return;setBusy(true);try{const {error}=await db.from("skills").delete().eq("id",id).eq("user_id",userId);if(error)throw error;await onChanged();if(editing===id){setEditing(null);setName("");}setNotice("Kemahiran dipadam.");}catch(e){setNotice(e instanceof Error?e.message:"Gagal memadam kemahiran.");}finally{setBusy(false)}}
 useEffect(()=>{if(editing&&!skills.some(x=>x.id===editing)){setEditing(null);setName("");}},[editing,skills]);
 return <section className="tf-card tf-section"><div className="tf-card-head"><div><h3>Tambah / Edit Kemahiran</h3><p>Taip apa-apa kemahiran, bukan terhad kepada lima kategori sahaja.</p></div><Plus size={18}/></div>
 <form className="tf-form" onSubmit={save}><label>Nama kemahiran<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: Proxmox, AWS, Python, CCTV, CNC..."/></label>
 <div className="tf-skill-presets">{presets.map(x=><button key={x} type="button" className={name===x?"active":""} onClick={()=>setName(x)}>{x}</button>)}</div>
 <label>Penilaian kendiri ({rating}/5)<input type="range" min={1} max={5} step={1} value={rating} onChange={e=>setRating(Number(e.target.value))}/></label>
 <div className="tf-form-actions"><button className="tf-btn" disabled={busy||!name.trim()}><Save size={15}/>{editing?"Kemas Kini Skill":"Simpan Skill"}</button>{editing&&<button className="tf-btn tf-btn-outline" type="button" onClick={()=>{setEditing(null);setName("");setRating(3);}}>Batal Edit</button>}</div>
 </form>
 {notice&&<p role="status" className="tf-hint" style={{marginTop:12}}>{notice}</p>}
 <div className="tf-skill-list">{skills.map(s=><div className="tf-listrow" key={s.id}><div className="tf-list-icon"><CheckCircle2 size={17}/></div><div><b>{s.name}</b><p>Penilaian sendiri: {s.self_rating||0}/5</p></div><button className="tf-iconbutton" title="Edit" aria-label={"Edit "+s.name} onClick={()=>{setEditing(s.id);setName(s.name);setRating(s.self_rating||3)}}><Pencil size={16}/></button><button className="tf-iconbutton" title="Padam" aria-label={"Padam "+s.name} disabled={busy} onClick={()=>void remove(s.id)}><Trash2 size={16}/></button></div>)}</div>
 </section>;
}
