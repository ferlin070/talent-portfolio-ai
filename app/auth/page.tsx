"use client";
import { useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

export default function AuthPage() {
 const [mode,setMode]=useState<"login"|"signup">("login");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 async function submit(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault();setBusy(true);setMessage("");
  try {
    const client=getSupabaseClient();
    if(mode==="signup"){
      const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+"/profile"}});
      if(error)throw error;
      setMessage(data.session?"Pendaftaran berjaya. Pergi ke profil untuk melengkapkan akaun.":"Pendaftaran diterima. Semak e-mel anda untuk mengesahkan akaun, kemudian log masuk.");
    }else{
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      window.location.assign("/profile");
    }
  } catch(err) {setMessage(err instanceof Error?err.message:"Ralat tidak diketahui.");}
  finally {setBusy(false);}
 }
 return <><span className="eyebrow">Your workspace</span><h1 className="heading">{mode==="login"?"Log masuk":"Cipta akaun"}</h1><p className="lead">Gunakan e-mel untuk mengakses portfolio peribadi anda.</p>
 <form onSubmit={submit} className="panel" style={{maxWidth:480,display:"grid",gap:14}}>
 <label>E-mel<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="form-input"/></label>
 <label>Kata laluan<input required minLength={6} type="password" autoComplete={mode==="signup"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} className="form-input"/></label>
 <button className="button" type="submit" disabled={busy}>{busy?"Memproses...":mode==="login"?"Log masuk":"Daftar"}</button>
 <button className="text-action" type="button" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("");}}>{mode==="login"?"Belum ada akaun? Daftar":"Sudah ada akaun? Log masuk"}</button>
 {message&&<p role="status" className="muted">{message}</p>}
 </form><p className="muted" style={{fontSize:13,marginTop:20}}>Nota: Pengesahan e-mel bergantung pada tetapan Supabase Auth. <Link href="/profile" style={{textDecoration:"underline"}}>Pergi ke profil</Link></p></>;
}
