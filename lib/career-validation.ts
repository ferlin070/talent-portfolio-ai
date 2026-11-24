/** A report is publishable only if Gemini ended naturally and supplied every mandatory section. */
export const REPORT_END_MARKER="TAMAT_LAPORAN";
const headings=[
 {id:1,needle:/kekuatan/i,min:3},
 {id:2,needle:/jurang/i,min:4},
 {id:3,needle:/30\s*\/\s*60\s*\/\s*90|pelan\s+(pembangunan|belajar|90)/i,min:3},
 {id:4,needle:/projek/i,min:2},
 {id:5,needle:/soalan/i,min:2}
];
export function verifyCareerReport(text:string,finishReason?:string){
 const normalized=text.replace(/\r\n?/g,"\n").trim();
 const ended=normalized.endsWith(REPORT_END_MARKER);
 const clean=normalized.replace(/\s*TAMAT_LAPORAN\s*$/,"").trim();
 const blocks=clean.split(/(?=^#{2,3}\s+\d\s*[.)]\s+)/gm).filter(Boolean);
 const found=blocks.filter(b=>/^#{2,3}\s+\d\s*[.)]\s+/.test(b));
 const problems:string[]=[];
 if(finishReason!=="STOP")problems.push("Gemini menghentikan output dengan sebab "+(finishReason||"tidak diketahui")+" (bukan STOP).");
 if(!ended)problems.push("Penanda tamat laporan tidak ditemui.");
 if(clean.length<1400)problems.push("Kandungan terlalu pendek untuk laporan lengkap.");
 if(found.length!==5)problems.push("Bilangan seksyen tidak lengkap ("+found.length+"/5).");
 for(const spec of headings){
  const section=found.find(s=>new RegExp("^#{2,3}\\s+"+spec.id+"\\s*[.)]\\s+").test(s));
  if(!section||!spec.needle.test(section.split("\n")[0])){problems.push("Seksyen "+spec.id+" tiada atau tajuknya salah.");continue;}
  const bulletCount=section.split("\n").filter(line=>/^\s*(?:[-*•]|\d+[.)])\s+\S/.test(line)).length;
  if(bulletCount<spec.min)problems.push("Seksyen "+spec.id+" memerlukan sekurang-kurangnya "+spec.min+" isi.");
  if(section.length<130)problems.push("Seksyen "+spec.id+" terlalu ringkas.");
 }
 return {complete:problems.length===0,clean,issues:problems};
}
