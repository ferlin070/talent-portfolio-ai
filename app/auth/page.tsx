"use client";
import Link from "next/link";
import { useEffect,useMemo,useState,type FormEvent } from "react";
import { Award, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type Mode="login"|"signup"|"reset"|"newpassword";
export default function AuthPage(){
 const client=useMemo(()=>getSupabaseClient(),[]);
 const [mode,setMode]=useState<Mode>("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 useEffect(()=>{const hash=window.location.hash;if(hash.includes("type=recovery"))setMode("newpassword");
  const {data:{subscription}}=client.auth.onAuthStateChange((event)=>{if(event==="PASSWORD_RECOVERY")setMode("newpassword");});
  return()=>subscription.unsubscribe();
 },[client]);
 const title={login:"Welcome back",signup:"Start your journey",reset:"Reset your password",newpassword:"Choose new password"}[mode];
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");setError("");
  try{
   if(mode==="signup"){
    const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+"/auth"}});
    if(error)throw error;
    if(data.session){window.location.assign("/profile");return}
    setMessage("Semak e-mel pengesahan anda. Sila klik pautan pengesahan sebelum log masuk.");
   }else if(mode==="login"){
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;
    window.location.assign("/dashboard");
   }else if(mode==="reset"){
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/auth"});if(error)throw error;
    setMessage("Jika alamat ini berdaftar, pautan reset kata laluan akan dihantar.");
   }else{
    const {error}=await client.auth.updateUser({password});if(error)throw error;
    setMessage("Kata laluan berjaya dikemas kini.");setMode("login");setPassword("");
   }
  }catch(e){setError(e instanceof Error?e.message:"Authentication failed");}
  finally{setBusy(false);}
 }
 return <main className="tf-auth-page"><div className="tf-auth-left"><Link href="/" className="tf-brand" style={{padding:0}}><span className="tf-brandicon tf-logo-mark"><img src="/talentfolio-mark.svg" alt="" width="38" height="38"/></span> Talentfolio AI</Link>
 <div><span className="tf-auth-badge"><Sparkles size={14}/> YOUR SKILLS DESERVE TO BE SEEN</span><h1>Your story.<br/>Your skills.<br/><em>Your future.</em></h1><p>One beautiful space to showcase your achievements and build a professional identity that keeps growing.</p><div className="tf-auth-points"><span><Award size={17}/> Professional Portfolio</span><span><ShieldCheck size={17}/> Private Certificate Vault</span><span><Sparkles size={17}/> Career Growth Insights</span></div></div><small>© 2026 Talentfolio AI · Privacy-first workspace</small></div>
 <div className="tf-auth-right"><div className="tf-auth-card"><div className="tf-auth-mobilebrand"><span className="tf-brandicon tf-logo-mark"><img src="/talentfolio-mark.svg" alt="" width="38" height="38"/></span> Talentfolio AI</div><div className="tf-eyebrow">PERSONAL WORKSPACE</div><h2>{title}</h2><p className="tf-auth-sub">{mode==="signup"?"Cipta akaun percuma untuk mula membina profil profesional.":mode==="login"?"Sign in to continue building your professional future.":mode==="reset"?"Kami akan hantarkan pautan set semula ke e-mel anda.":"Masukkan kata laluan baru untuk akaun anda."}</p>
 <form className="tf-form" onSubmit={submit}>
 {mode!=="newpassword"&&<label>E-mel address<div className="tf-auth-input"><Mail size={17}/><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></div></label>}
 {mode!=="reset"&&<label>Password<div className="tf-auth-input"><LockKeyhole size={17}/><input required minLength={6} type={visible?"text":"password"} autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 6 characters"/><button type="button" aria-label={visible?"Sembunyikan kata laluan":"Tunjuk kata laluan"} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
 {mode==="login"&&<button className="tf-auth-forgot" type="button" onClick={()=>{setMode("reset");setError("");setMessage("")}}>Forgot password?</button>}
 <button className="tf-btn tf-auth-submit" disabled={busy} type="submit">{busy?"Processing...":mode==="signup"?"Create account":mode==="reset"?"Send reset link":mode==="newpassword"?"Update password":"Sign in"} <ArrowRight size={17}/></button>
 {message&&<p role="status" className="tf-auth-success"><CheckCircle2 size={16}/>{message}</p>}{error&&<p role="alert" className="tf-auth-error">{error}</p>}
 </form>
 <div className="tf-auth-switch">{mode==="login"?<>New to Talentfolio? <button onClick={()=>{setMode("signup");setError("");setMessage("")}}>Create an account</button></>:<>Already have an account? <button onClick={()=>{setMode("login");setError("");setMessage("")}}>Sign in</button></>}</div>
 <p className="tf-auth-privacy"><ShieldCheck size={15}/> Your data stays private until you choose to publish a portfolio.</p></div></div></main>;
}
