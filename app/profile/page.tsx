"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

type Profile={display_name:string; user_type:"student"|"worker"; headline:string; bio:string; is_public:boolean};
const empty:Profile={display_name:"",user_type:"student",headline:"",bio:"",is_public:false};
export default function ProfilePage(){
 const [uid,setUid]=useState<string|null>(null);
 const [profile,setProfile]=useState<Profile>(empty);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  let active=true;
  async function load(){
   try {
    const client=getSupabaseClient();
    const {data:{user},error}=await client.auth.getUser();
    if(error)throw error;
    if(!active)return;
    if(!user){setLoading(false);return;}
    setUid(user.id);
    const {data,error:profileError}=await client.from("profiles").select("display_name,user_type,headline,bio,is_public").eq("user_id",user.id).maybeSingle();
    if(profileError)throw profileError;
    if(active&&data)setProfile({...empty,...data} as Profile);
   }catch(err){if(active)setMessage(err instanceof Error?err.message:"Ralat profil.");}
   finally {if(active)setLoading(false);}
  }
  void load();
  return()=>{active=false;};
 },[]);
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!uid)return;
  setSaving(true);setMessage("");
  try{
   const {error}=await getSupabaseClient().from("profiles").upsert({user_id:uid,...profile,updated_at:new Date().toISOString()},{onConflict:"user_id"});
   if(error)throw error;setMessage("Profil berjaya disimpan.");
  }catch(err){setMessage(err instanceof Error?err.message:"Tidak dapat menyimpan profil.");}
  finally{setSaving(false);}
 }
 async function logout(){await getSupabaseClient().auth.signOut();window.location.assign("/auth");}
 if(loading)return <p className="lead">Memuatkan profil...</p>;
 if(!uid)return <><h1 className="heading">Profil Peribadi</h1><p className="lead">{message||"Sila log masuk untuk mengurus maklumat anda."}</p><Link className="button" href="/auth">Log masuk</Link></>;
 return <><span className="eyebrow">My account</span><h1 className="heading">Profil Peribadi</h1><p className="lead">Data profil hanya boleh dikemas kini oleh pemilik akaun.</p>
 <form onSubmit={save} className="panel" style={{maxWidth:680,display:"grid",gap:16}}>
 <label>Nama paparan<input className="form-input" value={profile.display_name} onChange={e=>setProfile(p=>({...p,display_name:e.target.value}))} maxLength={120}/></label>
 <label>Jenis pengguna<select className="form-input" value={profile.user_type} onChange={e=>setProfile(p=>({...p,user_type:e.target.value as Profile["user_type"]}))}><option value="student">Pelajar</option><option value="worker">Pekerja</option></select></label>
 <label>Headline<input className="form-input" value={profile.headline} onChange={e=>setProfile(p=>({...p,headline:e.target.value}))} maxLength={160} placeholder="Contoh: Junior Software Developer"/></label>
 <label>Ringkasan diri<textarea className="form-input" rows={5} value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))} maxLength={3000}/></label>
 <p className="muted" style={{fontSize:13}}>Portfolio awam belum diaktifkan. Data profil kekal peribadi walaupun ada pilihan is_public dalam database.</p>
 <button className="button" type="submit" disabled={saving}>{saving?"Menyimpan...":"Simpan profil"}</button>
 {message&&<p role="status" className="muted">{message}</p>}
 </form><button className="text-action" onClick={logout} style={{marginTop:18}}>Log keluar</button></>;
}
