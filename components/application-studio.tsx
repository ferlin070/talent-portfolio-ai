"use client";
import {useState} from "react";
import {FileCheck,FileText,Copy,Download,ShieldCheck} from "lucide-react";
import {reviewResume,buildCoverLetter,MAX_RESUME_LENGTH,type ApplicationEvidence} from "@/lib/application-studio";

export default function ApplicationStudio({name,role,evidence}:{name:string;role:string;evidence:ApplicationEvidence[]}){
 const [resume,setResume]=useState(""),[requirements,setRequirements]=useState("");
 const [review,setReview]=useState<ReturnType<typeof reviewResume>|null>(null),[reviewError,setReviewError]=useState("");
 const [job,setJob]=useState(role),[company,setCompany]=useState(""),[language,setLanguage]=useState<"ms"|"en">("ms");
 const [selected,setSelected]=useState<string[]>([]),[draft,setDraft]=useState(""),[letterError,setLetterError]=useState(""),[notice,setNotice]=useState("");
 const chosen=evidence.filter(e=>selected.includes(e.id));
 const invalidate=()=>{setDraft("");setLetterError("");setNotice("")};
 const check=(id:string)=>{invalidate();setSelected(old=>old.includes(id)?old.filter(x=>x!==id):old.length<6?[...old,id]:old)};
 function generate(){setLetterError("");setNotice("");setDraft("");try{setDraft(buildCoverLetter({name,role:job,company,language,evidence:chosen}))}catch(e){setLetterError(e instanceof Error?e.message:"Draf tidak dapat dihasilkan.")}}
 async function copy(){try{await navigator.clipboard.writeText(draft);setNotice("Draf disalin.")}catch{setNotice("Salin gagal. Pilih teks dalam draf atau muat turun fail.")}}
 function download(){const url=URL.createObjectURL(new Blob([draft],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="talentfolio-cover-letter.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <section className="tf-career-studio tf-card tf-section" aria-labelledby="tf-application-title">
  <div className="tf-career-header"><div><div className="tf-eyebrow">CAREER INTELLIGENCE · APPLICATION TOOLS</div><h2 id="tf-application-title">Application Studio</h2><p>Semak teks resume dan sediakan surat permohonan daripada rekod yang anda pilih.</p></div><span className="tf-pill"><ShieldCheck size={15}/> Pemprosesan setempat</span></div>
  <div className="tf-career-grid">
   <section className="tf-career-tile" aria-labelledby="tf-resume-review-title">
    <span className="tf-career-icon"><FileCheck size={21}/></span>
    <h3 id="tf-resume-review-title">Resume Readiness — semakan ATS asas</h3>
    <p>Tampal teks resume dan senaraikan kemahiran yang diperlukan. Semakan ini mencari padanan perkataan dan tajuk seksyen biasa; bukan simulasi ATS sebenar atau semakan format PDF.</p>
    <form className="tf-form" onSubmit={e=>{e.preventDefault();setReview(null);setReviewError("");try{setReview(reviewResume(resume,requirements))}catch(e){setReviewError(e instanceof Error?e.message:"Semakan gagal.")}}}>
     <label htmlFor="tf-review-resume">Teks resume</label>
     <textarea id="tf-review-resume" rows={8} maxLength={MAX_RESUME_LENGTH} value={resume} onChange={e=>{setResume(e.target.value);setReview(null);setReviewError("")}} placeholder="Tampal kandungan resume sebagai teks..."/>
     <small>{resume.length.toLocaleString("ms-MY")} / 20,000 aksara. Tidak dimuat naik atau disimpan.</small>
     <label htmlFor="tf-review-requirements">Kata kunci jawatan (satu setiap baris)</label>
     <textarea id="tf-review-requirements" rows={4} maxLength={3000} value={requirements} onChange={e=>{setRequirements(e.target.value);setReview(null);setReviewError("")}} placeholder={"SQL\nLinux\nGit"}/>
     <button type="submit" className="tf-btn"><FileCheck size={16}/> Semak resume</button>
    </form>
    {reviewError&&<p role="alert" className="tf-career-error">{reviewError}</p>}
    {review&&<div className="tf-career-result" aria-live="polite"><strong className="tf-career-score">{review.coverage}%</strong><p>{review.matched} daripada {review.total} kata kunci ditemui dalam teks resume.</p><progress max={100} value={review.coverage} aria-label="Liputan kata kunci resume"/><ul>{review.entries.map(row=><li key={row.requirement}><b>{row.requirement}</b><span>{row.matched?"Ditemui":"Tidak ditemui — tambah hanya jika benar."}</span></li>)}</ul><h4>Tajuk seksyen biasa</h4><ul>{review.sections.map(s=><li key={s.id}><b>{s.label}</b><span>{s.found?"Dikesan":"Tidak dikesan — semak secara manual."}</span></li>)}</ul><small>Padanan teks bukan bukti kompetensi atau jaminan temuduga. Tajuk berbeza mungkin tidak dikesan.</small></div>}
   </section>
   <section className="tf-career-tile" aria-labelledby="tf-cover-letter-title">
    <span className="tf-career-icon"><FileText size={21}/></span>
    <h3 id="tf-cover-letter-title">Cover Letter Generator</h3>
    <p>Hasilkan draf Bahasa Melayu atau Inggeris menggunakan rekod sebenar yang anda pilih. Tiada penghantaran automatik.</p>
    <form className="tf-form" onSubmit={e=>{e.preventDefault();generate()}}>
     <label htmlFor="tf-letter-role">Jawatan dipohon</label><input id="tf-letter-role" required maxLength={120} value={job} onChange={e=>{setJob(e.target.value);invalidate()}}/>
     <label htmlFor="tf-letter-company">Nama organisasi</label><input id="tf-letter-company" required maxLength={120} value={company} onChange={e=>{setCompany(e.target.value);invalidate()}}/>
     <label htmlFor="tf-letter-language">Bahasa surat</label><select id="tf-letter-language" value={language} onChange={e=>{setLanguage(e.target.value==="en"?"en":"ms");invalidate()}}><option value="ms">Bahasa Melayu</option><option value="en">English</option></select>
     <fieldset className="tf-application-evidence"><legend>Rekod untuk dikongsi ({chosen.length}/6)</legend>{evidence.length?evidence.map(item=><label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} disabled={!selected.includes(item.id)&&chosen.length>=6} onChange={()=>check(item.id)}/><span><small>{({skill:"Kemahiran",project:"Projek awam",education:"Pendidikan",experience:"Pengalaman"} as const)[item.kind]}</small><br/>{item.label}</span></label>):<p>Tambah kemahiran, projek atau rekod pendidikan dan pengalaman terlebih dahulu.</p>}</fieldset>
     <small>Nama daripada profil: {name||"Belum diisi"}. Semak semua rekod sebelum berkongsi.</small>
     <button type="submit" className="tf-btn" disabled={!chosen.length||!name.trim()}><FileText size={16}/> Jana draf surat</button>
    </form>
    {letterError&&<p role="alert" className="tf-career-error">{letterError}</p>}
    {draft&&<div className="tf-career-result"><div className="tf-form"><label htmlFor="tf-letter-draft">Draf surat (boleh disunting)</label><textarea id="tf-letter-draft" rows={12} maxLength={16000} value={draft} onChange={e=>{setDraft(e.target.value);setNotice("")}}/></div><div className="tf-career-actions"><button type="button" className="tf-career-secondary" onClick={()=>void copy()}><Copy size={14}/> Salin draf</button><button type="button" className="tf-career-secondary" onClick={download}><Download size={14}/> Muat turun TXT</button></div><p role="status">{notice}</p><small>Semak kesahihan, kesesuaian jawatan dan gaya bahasa sebelum menghantar.</small></div>}
   </section>
  </div>
 </section>
}
