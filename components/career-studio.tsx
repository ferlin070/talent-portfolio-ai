"use client";
import {useMemo,useState} from "react";
import {Target,ClipboardCheck,CalendarDays,MessageCircle,ShieldCheck} from "lucide-react";
import {parseRequirements,compareRequirements,buildGrowthPlan,buildInterviewQuestions,type CareerEvidence,type CareerGap} from "@/lib/career-studio";

export default function CareerStudio({role,skills,gaps}:{role:string;skills:CareerEvidence[];gaps:CareerGap[]}){
 const [input,setInput]=useState("");
 const [requirements,setRequirements]=useState<string[]|null>(null);
 const [error,setError]=useState("");
 const [showHint,setShowHint]=useState(false);
 const [index,setIndex]=useState(0);
 const [answer,setAnswer]=useState("");
 const [completed,setCompleted]=useState<number[]>([]);
 const plan=useMemo(()=>buildGrowthPlan(gaps),[gaps]);
 const match=useMemo(()=>requirements?compareRequirements(requirements,skills):null,[requirements,skills]);
 const questions=useMemo(()=>buildInterviewQuestions(role,plan.focus),[role,plan.focus]);
 const question=questions[index];
 function resetInterview(){setIndex(0);setAnswer("");setShowHint(false);setCompleted([])}
 return <section className="tf-career-studio tf-card tf-section" aria-labelledby="tf-career-studio-title">
  <div className="tf-career-header"><div><div className="tf-eyebrow">CAREER INTELLIGENCE · PHASE 5</div><h2 id="tf-career-studio-title">Career Studio</h2><p>Persediaan untuk {role}. Gunakan kemahiran dan bukti kerja sebenar anda.</p></div><span className="tf-pill"><ShieldCheck size={15}/> Tanpa API key</span></div>
  <div className="tf-career-grid">
   <section className="tf-career-tile" aria-labelledby="tf-job-fit-title">
    <span className="tf-career-icon"><Target size={21}/></span>
    <h3 id="tf-job-fit-title">Job Fit — padanan syarat</h3>
    <p>Masukkan kemahiran daripada iklan jawatan, satu kemahiran setiap baris. Semakan ini hanya membandingkan nama kemahiran dalam profil.</p>
    <form className="tf-form" onSubmit={e=>{e.preventDefault();try{const next=parseRequirements(input);if(!next.length)throw Error("Masukkan sekurang-kurangnya satu syarat.");setRequirements(next);setError("")}catch(e){setRequirements(null);setError(e instanceof Error?e.message:"Input tidak sah.")}}}>
     <label htmlFor="tf-job-requirements">Syarat kemahiran</label>
     <textarea id="tf-job-requirements" rows={5} maxLength={3000} value={input} placeholder={"SQL\nLinux\nGit"} onChange={e=>{setInput(e.target.value);setRequirements(null);setError("")}}/>
     <small>Maksimum 25 syarat unik; 100 aksara setiap syarat.</small>
     <button className="tf-btn" type="submit"><ClipboardCheck size={16}/> Semak padanan</button>
    </form>
    {error&&<p role="alert" className="tf-career-error">{error}</p>}
    {match&&<div className="tf-career-result" aria-live="polite"><strong className="tf-career-score">{match.coverage}%</strong><p>{match.matched} daripada {match.total} syarat mempunyai padanan nama kemahiran.</p><progress max={100} value={match.coverage??0} aria-label="Liputan nama kemahiran"/><ul>{match.entries.map(row=><li key={row.requirement}><b>{row.requirement}</b><span>{row.matched?"Padanan: "+row.evidence.join(", "):"Belum ada padanan"}</span></li>)}</ul><small>Bukan skor ATS rasmi, kebarangkalian diterima bekerja atau pengesahan tahap kemahiran.</small></div>}
   </section>
   <section className="tf-career-tile" aria-labelledby="tf-plan-title">
    <span className="tf-career-icon"><CalendarDays size={21}/></span>
    <h3 id="tf-plan-title">Personalized 90-Day Roadmap</h3>
    <p>{plan.focus.length?"Fokus berdasarkan jurang sasaran kendiri: "+plan.focus.join(", "):"Tiada jurang positif dalam sasaran ilustrasi semasa. Terus bina bukti kerja."}</p>
    {plan.milestones.map(m=><article className="tf-career-milestone" key={m.day}><span>HARI {m.day}</span><h4>{m.title}</h4><p>{m.action}</p><small><b>Bukti:</b> {m.evidence}</small></article>)}
   </section>
   <section className="tf-career-tile tf-career-interview" aria-labelledby="tf-interview-title">
    <span className="tf-career-icon"><MessageCircle size={21}/></span>
    <h3 id="tf-interview-title">Mock Interview — latihan kendiri</h3>
    <p>Latihan berstruktur, bukan penilaian AI. Jawapan kekal dalam sesi halaman ini dan tidak dihantar ke pelayan.</p>
    <div aria-live="polite"><small>Soalan {index+1}/{questions.length} · {completed.length} dilatih</small><h4>{question.question}</h4></div>
    <div className="tf-form"><label htmlFor="tf-interview-answer">Jawapan latihan</label><textarea id="tf-interview-answer" rows={5} maxLength={4000} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Situasi, tugas, tindakan dan hasil sebenar..."/></div>
    <button className="tf-career-secondary" type="button" aria-expanded={showHint} onClick={()=>setShowHint(v=>!v)}>{showHint?"Sembunyikan panduan":"Lihat panduan jawapan"}</button>
    {showHint&&<p className="tf-career-hint">{question.hint}</p>}
    <div className="tf-career-actions"><button className="tf-btn" type="button" disabled={!answer.trim()||completed.includes(index)} onClick={()=>setCompleted(old=>[...old,index])}>Tandakan sudah dilatih</button><button type="button" className="tf-career-secondary" disabled={!completed.includes(index)||index===questions.length-1} onClick={()=>{setIndex(v=>v+1);setAnswer("");setShowHint(false)}}>Soalan seterusnya</button><button type="button" className="tf-career-secondary" onClick={resetInterview}>Mula semula</button></div>
    {completed.length===questions.length&&<p role="status">Latihan selesai. Semak jawapan bersama mentor sebelum temu duga sebenar.</p>}
   </section>
  </div>
  <p className="tf-career-note"><ShieldCheck size={16}/> Padanan, pelan dan soalan dihasilkan oleh peraturan telus. Analisis Gemini tersedia dalam modul berasingan dengan persetujuan pengguna.</p>
 </section>
}
