"use client";
import {useState} from "react";
import {BrainCircuit,Sparkles,ShieldCheck} from "lucide-react";
import {getSupabaseClient} from "@/lib/supabase";
import {parseCoachFeedback,type CoachFeedback,type CoachMode} from "@/lib/career-coach";

export default function AICareerCoach({role,model,apiKey,disabled}:{role:string;model:string;apiKey:string;disabled:boolean}){
 const [mode,setMode]=useState<CoachMode>("interview"),[language,setLanguage]=useState<"ms"|"en">("ms");
 const [question,setQuestion]=useState(""),[answer,setAnswer]=useState(""),[consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState<CoachFeedback|null>(null),[error,setError]=useState("");
 const clear=()=>{setFeedback(null);setError("");setConsent(false)};
 async function submit(){
  if(busy||disabled||!consent||!apiKey)return;
  setBusy(true);setError("");setFeedback(null);
  try{
   const {data:{session}}=await getSupabaseClient().auth.getSession();
   if(!session)throw Error("Sila log masuk semula.");
   const response=await fetch("/api/career/coach",{method:"POST",cache:"no-store",headers:{"content-type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({mode,language,role,question,answer,model,apiKey,consent:true})});
   const data=await response.json();
   if(!response.ok)throw Error(typeof data.error==="string"?data.error:"Coaching gagal.");
   const result=parseCoachFeedback(JSON.stringify(data.feedback),"STOP");
   if(!result)throw Error("Maklum balas tidak lengkap.");
   setFeedback(result);
  }catch(e){setError(e instanceof Error?e.message:"Coaching gagal.")}finally{setBusy(false);setConsent(false)}
 }
 return <section className="tf-career-tile tf-coach-panel" aria-labelledby="tf-ai-coach-title">
  <span className="tf-career-icon"><BrainCircuit size={21}/></span>
  <h3 id="tf-ai-coach-title">AI Interview & Career Coach</h3>
  <p>Maklum balas Gemini untuk latihan anda. Menggunakan key pertama yang sah dan model dipilih di atas. Sasaran: {role}.</p>
  <form className="tf-form" onSubmit={e=>{e.preventDefault();void submit()}}>
   <fieldset disabled={busy||disabled} className="tf-coach-fields">
    <label htmlFor="tf-coach-mode">Jenis coaching</label><select id="tf-coach-mode" value={mode} onChange={e=>{setMode(e.target.value==="career"?"career":"interview");setQuestion("");setAnswer("");clear()}}><option value="interview">AI Interview Coach</option><option value="career">AI Career Coach</option></select>
    <label htmlFor="tf-coach-language">Bahasa maklum balas</label><select id="tf-coach-language" value={language} onChange={e=>{setLanguage(e.target.value==="en"?"en":"ms");clear()}}><option value="ms">Bahasa Melayu</option><option value="en">English</option></select>
    <label htmlFor="tf-coach-question">{mode==="interview"?"Soalan temu duga":"Soalan kerjaya"}</label><textarea id="tf-coach-question" required rows={3} maxLength={500} value={question} onChange={e=>{setQuestion(e.target.value);clear()}} placeholder={mode==="interview"?"Ceritakan satu projek yang mencabar.":"Apakah tindakan pembelajaran seterusnya?"}/>
    <label htmlFor="tf-coach-answer">{mode==="interview"?"Jawapan latihan untuk Gemini":"Konteks tambahan (pilihan)"}</label><textarea id="tf-coach-answer" required={mode==="interview"} rows={5} maxLength={4000} value={answer} onChange={e=>{setAnswer(e.target.value);clear()}} placeholder="Masukkan hanya maklumat yang anda rela kongsi."/>
    <label className="tf-ai-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Saya bersetuju menghantar jawatan sasaran, soalan dan jawapan/konteks di atas kepada Google Gemini melalui pelayan Talentfolio. API key digunakan untuk panggilan ini. Saya telah membuang maklumat sulit.</label>
   </fieldset>
   <p className="tf-career-note"><ShieldCheck size={16}/> Tiada rekod profil lain diambil oleh endpoint coaching. Maklum balas tidak disimpan oleh Talentfolio. Google boleh memproses data mengikut terma pelan anda. Had bersama: 5 analisis sejam. Caj bergantung pada akaun Google anda.</p>
   <button className="tf-btn" type="submit" disabled={busy||disabled||!consent||!apiKey||!question.trim()||(mode==="interview"&&!answer.trim())}><Sparkles size={16}/>{busy?"Gemini sedang memberi maklum balas...":"Jana maklum balas Gemini"}</button>
  </form>
  {!apiKey&&<p>Masukkan atau buka key Gemini yang tersimpan di atas dahulu.</p>}
  {error&&<p role="alert" className="tf-career-error">{error}</p>}
  {feedback&&<div className="tf-career-result" aria-live="polite"><h4>Ringkasan AI</h4><p>{feedback.summary}</p>{([["Kekuatan",feedback.strengths],["Penambahbaikan",feedback.improvements],["Tindakan seterusnya",feedback.nextSteps]] as const).map(([title,items])=><div key={title}><h4>{title}</h4><ul>{items.map((item,i)=><li key={i}>{item}</li>)}</ul></div>)}<h4>Soalan susulan</h4><p>{feedback.followUp}</p><small>Cadangan AI untuk pembelajaran, bukan pengesahan kelayakan atau keputusan pengambilan pekerja. Semak fakta dan bincang dengan mentor.</small></div>}
 </section>
}
