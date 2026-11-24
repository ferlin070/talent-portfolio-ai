"use client";
import {useMemo,useState} from "react";
import {BrainCircuit,Copy,Sparkles,ExternalLink} from "lucide-react";
import Link from "next/link";
import {getSupabaseClient} from "@/lib/supabase";
export default function AIAnalysis({role,skills}:{role:string;skills:{name:string;self_rating:number|null}[]}){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [copied,setCopied]=useState(false);
 const analysisPrompt=`Anda ialah penasihat kerjaya berpengalaman di Malaysia. Saya menyasarkan jawatan ${role}. Kemahiran berikut adalah PENILAIAN KENDIRI sahaja (bukan sijil pengesahan):\n${skills.map(s=>`- ${s.name}: ${s.self_rating||"belum dinilai"}/5`).join("\n")}\n\nBuat analisis jurang kemahiran, kemahiran utama yang perlu dibangunkan, pelan 30/60/90 hari dan cadangan projek portfolio untuk membuktikan kebolehan. Jangan mereka kelayakan atau pengalaman. Nyatakan andaian dan data yang perlu saya tambahkan. Gunakan Bahasa Melayu Malaysia.`;
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[result,setResult]=useState(""),[error,setError]=useState("");
 async function analyze(){
  setBusy(true);setError("");try{
   const {data:{session},error:sessionError}=await db.auth.getSession();
   if(sessionError||!session)throw Error("Sila log masuk terlebih dahulu.");
   const response=await fetch("/api/skills/analyze",{method:"POST",headers:{"content-type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({role})});
   const json=await response.json() as {analysis?:string;error?:string};
   if(!response.ok)throw Error(json.error||"AI sedang tidak tersedia.");
   setResult(json.analysis||"");
  }catch(e){setError(e instanceof Error?e.message:"Tidak berjaya mendapatkan analisis AI.");}finally{setBusy(false)}
 }
 return <section className="tf-card tf-section tf-ai-panel"><div className="tf-card-head"><div><h3><BrainCircuit size={20}/> AI Career & Skills Analysis</h3><p>Penilaian AI berdasarkan kemahiran, projek, pendidikan dan pengalaman sebenar dalam akaun anda.</p></div><span className="tf-pill">AI-powered*</span></div>
 <p className="tf-hint">Sasaran semasa: <b>{role}</b>. Analisis ini ialah panduan pembangunan kerjaya, bukan pengesahan kompetensi atau kelayakan profesional.</p>
 <label className="tf-ai-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Saya bersetuju maklumat kemahiran, pendidikan, pengalaman dan projek saya dihantar kepada penyedia AI apabila menekan butang analisis.</label>
 <button className="tf-btn" type="button" disabled={busy||!consent} onClick={()=>void analyze()}><Sparkles size={16}/>{busy?"Sedang menganalisis...":"Jana Analisis AI"}</button>
 {error&&<div className="tf-ai-error" role="alert">{error}<p>Anda masih boleh menyediakan prompt profesional menggunakan <Link href="/prompt-generator">Prompt Generator</Link> tanpa API berbayar.</p></div>}
 {result&&<div className="tf-ai-result"><div className="tf-form-actions"><strong>Cadangan AI berdasarkan profil anda</strong><button className="tf-btn tf-btn-outline" onClick={()=>void navigator.clipboard.writeText(result)}><Copy size={14}/> Copy</button></div><div className="tf-ai-content">{result}</div></div>}
 <button className="tf-btn tf-btn-outline" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(analysisPrompt);setCopied(true);}catch{setError("Gagal menyalin prompt. Sila cuba sekali lagi.");}}}><Copy size={15}/>{copied?"Prompt Disalin!":"Salin Prompt Analisis untuk Mana-mana AI"}</button>
 <p className="tf-muted">* Fungsi AI memerlukan OPENAI_API_KEY pada pelayan Vercel dan mempunyai kos penggunaan API. Jika belum dikonfigurasi, sistem akan memberitahu anda dan tidak menghasilkan analisis palsu.</p>
 </section>;
}
