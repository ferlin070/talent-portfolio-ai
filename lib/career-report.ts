export const CAREER_DISCLOSURE="Laporan ini ialah cadangan pembangunan kerjaya berdasarkan input profil dan penilaian kendiri. Ia bukan pengesahan sijil, tahap kompetensi atau pengalaman oleh pihak ketiga.";
export type ReportBlock={type:"h1"|"h2"|"h3"|"bullet"|"number"|"paragraph"|"quote";text:string};
export type ReportSection={title:string;blocks:ReportBlock[];index:number;kind:"strength"|"gap"|"roadmap"|"project"|"question"|"general"};
function plain(s:string){return s.replace(/\*\*(.*?)\*\*/g,"$1").replace(/__(.*?)__/g,"$1").replace(/\*([^*]+)\*/g,"$1").replace(/_([^_]+)_/g,"$1").replace(/\s+$/,"").trim()}
function classify(s:string):ReportSection["kind"]{
 const t=s.toLowerCase();
 if(/kekuatan|strength|kelebihan/.test(t))return "strength";
 if(/jurang|gap|kekurangan|improvement/.test(t))return "gap";
 if(/roadmap|pelan|30\/60\/90|90 hari|pembangunan diri/.test(t))return "roadmap";
 if(/projek|project|portfolio/.test(t))return "project";
 if(/soalan|question|maklumat belum|data belum/.test(t))return "question";
 return "general";
}
export function parseCareerReport(input:string){
 const lines=input.replace(/\r\n?/g,"\n").split("\n");
 const intro:ReportBlock[]=[];
 const sections:ReportSection[]=[];
 let current:ReportSection|null=null;
 function append(block:ReportBlock){if(current)current.blocks.push(block);else intro.push(block);}
 for(const original of lines){
  const trimmed=original.trim();
  if(!trimmed || /^([-*_])\1{2,}$/.test(trimmed) || trimmed==="TAMAT_LAPORAN")continue;
  const heading=/^(#{1,5})\s+(.+)$/.exec(trimmed);
  const boldHeading=/^\*\*(?:\d+[.)]?\s*)?([^*]{5,110})\*\*\s*$/.exec(trimmed);
  const numberedHeading=/^(\d{1,2})[.)]\s+(.{7,120})$/.exec(trimmed);
  if((heading&&heading[1].length<=3)||(boldHeading&&/kekuatan|jurang|pelan|projek|soalan|ringkasan|strength|skill|gap|roadmap|project|question/i.test(boldHeading[1]))||(numberedHeading&&/kekuatan|jurang|pelan|projek|soalan|ringkasan|strength|skill|gap|roadmap|project|question/i.test(numberedHeading[2]))){
   const title=plain((heading?heading[2]:boldHeading?boldHeading[1]:numberedHeading![2]).replace(/^\d+[.)]\s*/,""));
   current={title,index:sections.length+1,kind:classify(title),blocks:[]};sections.push(current);continue;
  }
  const bullet=/^(?:[-*•]|\d+[.)])\s+(.+)$/.exec(trimmed);
  if(bullet){append({type:/^\d/.test(trimmed)?"number":"bullet",text:bullet[1]});continue;}
  if(/^>\s+/.test(trimmed)){append({type:"quote",text:trimmed.replace(/^>\s+/,"")});continue;}
  if(/^#{1,5}\s+/.test(trimmed)){append({type:"h3",text:plain(trimmed.replace(/^#{1,5}\s+/,""))});continue;}
  if(/\|.*\|/.test(trimmed)&&trimmed.startsWith("|")){append({type:"paragraph",text:plain(trimmed)});continue;}
  const last=current?current.blocks[current.blocks.length-1]:intro[intro.length-1];
  if(last&&(last.type==="paragraph"||last.type==="bullet"||last.type==="number")&&!/^[•*\d]/.test(original)&&/^\s{2,}\S/.test(original)){last.text+=" "+trimmed;}
  else append({type:"paragraph",text:trimmed});
 }
 return {intro,sections};
}
export function cleanReportText(s:string){return plain(s)}
