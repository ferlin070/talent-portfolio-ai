"use client";
import Link from "next/link";
import { useEffect,useMemo,useState,type FormEvent } from "react";
import { ArrowLeft,CheckCircle2,Eye,EyeOff,KeyRound,LockKeyhole,Mail,Send,ShieldCheck,UserRound } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
export default function AccountSettings(){
 const client=useMemo(()=>getSupabaseClient(),[]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[email,setEmail]=useState(""),[signedIn,setSignedIn]=useState(false);
 const [oldPassword,setOldPassword]=useState(""),[password,setPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState(""),[nonce,setNonce]=useState(""),[visible,setVisible]=useState(false);
 const [success,setSuccess]=useState(""),[error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{try{const {data,error}=await client.auth.getUser();if(error)throw error;if(active&&data.user){setEmail(data.user.email||"");setSignedIn(true)}}catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load account")}finally{if(active)setLoading(false)}})();return()=>{active=false}},[client]);
 async function act(fn:()=>Promise<void>){setBusy(true);setSuccess("");setError("");try{await fn()}catch(e){setError(e instanceof Error?e.message:"Ralat akaun.")}finally{setBusy(false)}}
 async function changePassword(e:FormEvent){e.preventDefault();await act(async()=>{
  if(password.length<10)throw new Error("Gunakan sekurang-kurangnya 10 aksara untuk kata laluan baharu.");
  if(password!==confirmPassword)throw new Error("Kata laluan baharu dan pengesahan tidak sepadan.");
  if(oldPassword===password)throw new Error("Sila gunakan kata laluan baharu yang berbeza.");
  if(!email)throw new Error("E-mel akaun tidak ditemui.");
  // Confirm user knows their existing password before changing it.
  const {error:checkError}=await client.auth.signInWithPassword({email,password:oldPassword});
  if(checkError)throw new Error("Kata laluan semasa tidak betul.");
  const {error:updateError}=await client.auth.updateUser({password,...(nonce.trim()?{nonce:nonce.trim()}:{})});
  if(updateError)throw updateError;
  setOldPassword("");setPassword("");setConfirmPassword("");setNonce("");
  setSuccess("Kata laluan berjaya ditukar. Gunakan kata laluan baharu untuk log masuk seterusnya.");
 })}
 async function resetPassword(){await act(async()=>{
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/auth"});
  if(error)throw error;
  setSuccess("Jika akaun anda menyokong reset melalui e-mel, pautan akan dihantar ke alamat berdaftar.");
 })}
 async function sendNonce(){await act(async()=>{
  const {error}=await client.auth.reauthenticate();if(error)throw error;
  setSuccess("Kod pengesahan semula dihantar ke e-mel anda. Masukkan kod di bawah dan cuba tukar kata laluan.");
 })}
 return <main className="tf-settings-page"><div className="tf-settings-wrap">
  <div className="tf-settings-top"><Link href="/dashboard" className="tf-btn tf-btn-outline"><ArrowLeft size={16}/> Back to Dashboard</Link><span><ShieldCheck size={15}/> Private Account</span></div>
  <div className="tf-eyebrow">ACCOUNT & SECURITY</div><h1>Account Settings</h1><p className="tf-settings-sub">Urus keselamatan akaun dan kata laluan Talentfolio AI anda.</p>
  {loading?<p>Memuatkan akaun...</p>:!signedIn?<section className="tf-card tf-section"><h2>Log masuk diperlukan</h2><p>Sila log masuk sebelum mengubah tetapan akaun.</p><Link className="tf-btn" href="/auth">Log masuk</Link></section>:<>
  <section className="tf-card tf-settings-card"><div className="tf-settings-section-head"><div className="tf-settings-icon"><UserRound size={21}/></div><div><h2>Account Information</h2><p>Alamat e-mel yang dipautkan ke akaun anda.</p></div></div>
   <label>E-mel Berdaftar<div className="tf-settings-readonly"><Mail size={17}/>{email}</div></label><div className="tf-settings-note"><ShieldCheck size={16}/> Alamat e-mel digunakan untuk pengesahan akaun dan pautan reset kata laluan.</div></section>
  <section className="tf-card tf-settings-card"><div className="tf-settings-section-head"><div className="tf-settings-icon"><LockKeyhole size={21}/></div><div><h2>Change Password</h2><p>Untuk keselamatan, sahkan kata laluan semasa sebelum menetapkan yang baharu.</p></div></div>
   <form className="tf-form" onSubmit={e=>void changePassword(e)}>
    <label>Kata Laluan Semasa<input type={visible?"text":"password"} value={oldPassword} onChange={e=>setOldPassword(e.target.value)} autoComplete="current-password" required/></label>
    <div className="tf-formgrid"><label>Kata Laluan Baharu<input type={visible?"text":"password"} minLength={10} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" required placeholder="Minimum 10 aksara"/></label>
    <label>Sahkan Kata Laluan Baharu<input type={visible?"text":"password"} minLength={10} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" required/></label></div>
    <label className="tf-checkbox"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/>{visible?<EyeOff size={16}/>:<Eye size={16}/>} Papar kata laluan</label>
    <details className="tf-nonce-details"><summary>Perlu kod pengesahan tambahan?</summary><p>Jika Supabase mewajibkan pengesahan semula, hantar kod OTP ke e-mel dan masukkan nombor yang diterima.</p><button className="tf-btn tf-btn-outline" type="button" disabled={busy} onClick={()=>void sendNonce()}><Send size={15}/> Hantar Kod</button><label>Kod e-mel (jika diperlukan)<input value={nonce} onChange={e=>setNonce(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="6 digit"/></label></details>
    <button className="tf-btn tf-settings-primary" disabled={busy} type="submit"><KeyRound size={16}/>{busy?"Memproses...":"Change Password"}</button>
   </form>
  </section>
  <section className="tf-card tf-settings-card"><div className="tf-settings-section-head"><div className="tf-settings-icon"><Mail size={21}/></div><div><h2>Reset Password via Email</h2><p>Terlupa kata laluan? Hantar pautan reset ke e-mel akaun anda.</p></div></div><button className="tf-btn tf-btn-outline" disabled={busy} onClick={()=>void resetPassword()}><Mail size={16}/> Send Reset Link</button><p className="tf-hint">Pautan reset akan membuka halaman pemulihan melalui e-mel. Tetapan URL dan SMTP perlu dikonfigurasi di Supabase.</p></section>
  {success&&<div role="status" className="tf-settings-success"><CheckCircle2 size={18}/>{success}</div>}
  {error&&<div role="alert" className="tf-settings-error">{error}</div>}
  </>}
 </div></main>
}
