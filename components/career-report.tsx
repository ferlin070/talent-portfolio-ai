"use client";
import {useMemo,useRef,useState} from "react";
import {ArrowDownToLine,BookOpenCheck,BriefcaseBusiness,CheckCircle2,Copy,Download,FileText,GraduationCap,Lightbulb,Printer,Route,ShieldCheck,Sparkles,Target} from "lucide-react";
import {parseCareerReport,cleanReportText,CAREER_DISCLOSURE,type ReportBlock,type ReportSection} from "@/lib/career-report";
import {downloadCareerDocx} from "@/lib/career-docx";
import {printCareerReport} from "@/lib/career-print";
import SupportPartners from "@/components/support-partners";
const marks={
 strength:{label:"KEKUATAN UTAMA",icon:CheckCircle2},
 gap:{label:"JURANG KEMAHIRAN",icon:Target},
 roadmap:{label:"PELAN 30 / 60 / 90 HARI",icon:Route},
 project:{label:"CADANGAN PROJEK",icon:BriefcaseBusiness},
 question:{label:"PERKARA UNTUK DILENGKAPKAN",icon:Lightbulb},
 general:{label:"PENILAIAN KERJAYA",icon:BookOpenCheck}
};
function inline(content:string){
 return content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((span,i)=>{
  if(span.startsWith("**")&&span.endsWith("**"))return <strong key={i}>{span.slice(2,-2)}</strong>;
  if(span.startsWith("*")&&span.endsWith("*"))return <em key={i}>{span.slice(1,-1)}</em>;
  return <span key={i}>{span}</span>;
 });
}
function Paragraph({block}:{block:ReportBlock}){
 const txt=block.text;
 if(block.type==="bullet"||block.type==="number")return <li className="tf-report-bullet">{inline(txt)}</li>;
 if(block.type==="quote")return <blockquote className="tf-report-quote">{inline(txt)}</blockquote>;
 if(block.type==="h1"||block.type==="h2"||block.type==="h3")return <h4 className="tf-report-subhead">{inline(txt)}</h4>;
 return <p>{inline(txt)}</p>;
}
function Blocks({blocks}:{blocks:ReportBlock[]}){
 const groups:Array<{bullet:boolean;blocks:ReportBlock[]}>=[];let last:{bullet:boolean;blocks:ReportBlock[]}|undefined;
 for(const block of blocks){const bullet=block.type==="bullet"||block.type==="number";
  if(!last||last.bullet!==bullet){last={bullet,blocks:[]};groups.push(last);}last.blocks.push(block);
 }
 return <>{groups.map((g,i)=>g.bullet?<ul key={i} className="tf-report-list">{g.blocks.map((b,j)=><Paragraph key={j} block={b}/>)}</ul>:<div key={i} className="tf-report-prose">{g.blocks.map((b,j)=><Paragraph key={j} block={b}/>)}</div>)}</>;
}
function ReportSectionView({section}:{section:ReportSection}){
 const M=marks[section.kind],Icon=M.icon;
 return <section className={`tf-report-section tf-report-section-${section.kind}`}>
   <div className="tf-report-section-head"><div className="tf-report-section-icon"><Icon size={20}/></div><div><span>{M.label} / {String(section.index).padStart(2,"0")}</span><h3>{section.title}</h3></div></div>
   <Blocks blocks={section.blocks}/>
  </section>;
}
export default function CareerReport({text,role,model,usedSlot,onCopy}:{text:string;role:string;model:string;usedSlot:number|null;onCopy:()=>void}){
 const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState("");
 const reportRef=useRef<HTMLElement>(null);
 const parsed=useMemo(()=>parseCareerReport(text),[text]);
 const date=useMemo(()=>new Intl.DateTimeFormat("ms-MY",{year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Kuala_Lumpur"}).format(new Date()),[]);
 function isComplete(){
  return text.length>=1400 && parsed.sections.length===5 &&
    (["strength","gap","roadmap","project","question"] as const).every(kind=>parsed.sections.some(x=>x.kind===kind&&x.blocks.length>0));
 }
 function exportPdf(){
  try{
   setExportError("");
   if(!isComplete())throw Error("Laporan tidak lengkap. Sila jana semula sebelum mengeksport.");
   if(!reportRef.current)throw Error("Paparan laporan belum tersedia.");
   printCareerReport(reportRef.current);
  }catch(e){setExportError(e instanceof Error?e.message:"Gagal membuka cetakan PDF.");}
 }
 async function exportWord(){
  try{setExporting(true);setExportError("");if(!isComplete())throw Error("Laporan tidak lengkap. Sila jana semula sebelum eksport.");await downloadCareerDocx(text,{role,date,model});}
  catch(e){setExportError(e instanceof Error?e.message:"Dokumen Word tidak dapat dijana.");}
  finally{setExporting(false);}
 }
 return <div className="tf-report-root">
  <div className="tf-report-toolbar"><div><span><Sparkles size={15}/> GEMINI CAREER INTELLIGENCE</span><h3>Laporan Analisis Profesional</h3><p>Direka untuk semakan kerjaya, pembentangan, penyimpanan dan perkongsian.</p></div><div className="tf-report-export">
    <button type="button" className="tf-report-export-secondary" onClick={onCopy}><Copy size={16}/> Copy</button>
    <button type="button" className="tf-report-export-primary" onClick={exportPdf}><Printer size={16}/> Export PDF</button>
    <button type="button" className="tf-report-export-primary" disabled={exporting} onClick={exportWord}><Download size={16}/> Export Word</button>
  </div></div>
  {exportError&&<p role="alert" className="tf-ai-error">{exportError}</p>}
  <article ref={reportRef} className="tf-career-report">
   <header className="tf-report-cover">
    <div className="tf-report-cover-top"><div className="tf-report-brand"><span className="tf-report-brand-mark"><Sparkles size={17}/></span> TALENTFOLIO <b>AI</b></div><span className="tf-report-cover-edition">CAREER DEVELOPMENT REPORT / {new Date().getFullYear()}</span></div>
    <div className="tf-report-cover-body"><span className="tf-report-eyebrow">PERSONALIZED CAREER INTELLIGENCE</span><h2>Skills &amp; Career<br/><em>Growth Report.</em></h2><div className="tf-report-cover-line"/><p>Analisis kemahiran, bukti pengalaman dan pelan pembangunan kerjaya berdasarkan maklumat yang disediakan oleh pemilik portfolio.</p></div>
    <div className="tf-report-cover-meta"><div><span>JAWATAN SASARAN</span><strong>{role}</strong></div><div><span>TARIKH LAPORAN</span><strong>{date}</strong></div><div><span>DIJANA DENGAN</span><strong>{model||"Gemini AI"}</strong></div></div>
    <SupportPartners variant="report"/>
   </header>
   <div className="tf-report-paper">
    <div className="tf-report-paper-kicker"><span>01 / LAPORAN PEMBANGUNAN PROFESIONAL</span><span>Talentfolio AI</span></div>
    {parsed.intro.length>0&&<section className="tf-report-lead"><div className="tf-report-lead-icon"><GraduationCap size={24}/></div><div><h3>Ringkasan Eksekutif</h3><Blocks blocks={parsed.intro}/></div></section>}
    <div className="tf-report-summary-stripe"><div><span>FOKUS KERJAYA</span><strong>{role}</strong></div><div><span>BAHAGIAN ANALISIS</span><strong>{parsed.sections.length} seksyen</strong></div><div><span>SUMBER</span><strong>Profil &amp; Gemini AI</strong></div></div>
    {parsed.sections.length?parsed.sections.map(section=><ReportSectionView key={section.index} section={section}/>):<section className="tf-report-section"><h3>Analisis Lengkap</h3><p>{cleanReportText(text)}</p></section>}
    <footer className="tf-report-footer"><div><ShieldCheck size={20}/><p><strong>Nota Ketelusan</strong> — {CAREER_DISCLOSURE}</p></div><span>Generated with Talentfolio AI · {date}{usedSlot?` · Gemini Key #${usedSlot}`:""}</span></footer>
   </div>
  </article>
  <p className="tf-report-footnote"><FileText size={15}/> Eksport PDF menggunakan dialog Print browser (pilih <b>Save as PDF</b>). Eksport Word menghasilkan fail <b>.docx</b> yang boleh disunting dalam Microsoft Word.</p>
 </div>;
}
