import { parseRequirements } from "./career-studio.ts";

export const MAX_RESUME_LENGTH=20000;
export type ApplicationEvidence={id:string;kind:"skill"|"project"|"education"|"experience";label:string};
export type LetterInput={name:string;role:string;company:string;language:"ms"|"en";evidence:ApplicationEvidence[]};

function cleanLine(value:string,max:number,label:string,required=true){
 const cleaned=value.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
 if((required&&!cleaned)||cleaned.length>max)throw Error(label+" tidak sah atau terlalu panjang.");
 return cleaned;
}
function normalize(value:string){
 return value.normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/g," ").trim();
}
function escapeRegex(value:string){return value.replace(/[.*+?^$(){}|[\]\\]/g,"\\$&")}

/** Text-only heuristic; does not parse PDFs or simulate a vendor ATS. */
export function reviewResume(text:string,rawRequirements:string){
 if(text.length>MAX_RESUME_LENGTH)throw Error("Teks resume melebihi 20,000 aksara.");
 const source=text.trim();
 if(!source)throw Error("Tampal teks resume terlebih dahulu.");
 const requirements=parseRequirements(rawRequirements);
 if(!requirements.length)throw Error("Masukkan sekurang-kurangnya satu syarat kemahiran.");
 const normalized=normalize(source);
 const entries=requirements.map(requirement=>{
  const phrase=normalize(requirement);
  // Preserve punctuation in C++, C#, .NET, Node.js; never match SQL in MySQL.
  const pattern=new RegExp("(^|[^\\p{L}\\p{N}+#.])"+escapeRegex(phrase)+"(?=$|[^\\p{L}\\p{N}+#.]|\\.(?=\\s|$))","u");
  return {requirement,matched:pattern.test(normalized)};
 });
 const matched=entries.filter(r=>r.matched).length;
 const lines=source.split(/\r?\n/).map(l=>normalize(l).replace(/[:：]\s*$/,""));
 const sections=[
  {id:"summary",label:"Ringkasan / Summary",names:["summary","professional summary","profile","objective","career objective","ringkasan","profil","objektif kerjaya"]},
  {id:"skills",label:"Kemahiran / Skills",names:["skills","technical skills","core skills","competencies","kemahiran","kemahiran teknikal","kompetensi"]},
  {id:"education",label:"Pendidikan / Education",names:["education","academic background","qualifications","pendidikan","kelayakan akademik"]},
  {id:"experience",label:"Pengalaman atau Projek / Experience or Projects",names:["experience","work experience","professional experience","employment history","projects","selected projects","pengalaman","pengalaman kerja","projek","projek terpilih"]},
 ].map(({id,label,names})=>({id,label,found:lines.some(line=>names.includes(line))}));
 return {entries,matched,total:entries.length,coverage:Math.round(100*matched/entries.length),sections};
}

export function buildCoverLetter(input:LetterInput){
 const name=cleanLine(input.name,100,"Nama");
 const role=cleanLine(input.role,120,"Jawatan");
 const company=cleanLine(input.company,120,"Organisasi");
 if(input.language!=="ms"&&input.language!=="en")throw Error("Bahasa tidak sah.");
 if(input.evidence.length>6)throw Error("Pilih maksimum enam bukti.");
 const evidence=input.evidence.map(item=>{
  if(!["skill","project","education","experience"].includes(item.kind))throw Error("Jenis bukti tidak sah.");
  return {...item,label:cleanLine(item.label,300,"Bukti")};
 });
 if(!evidence.length)throw Error("Pilih sekurang-kurangnya satu rekod yang ingin dikongsi.");
 const ms=input.language==="ms";
 const kinds=ms?{skill:"Kemahiran direkodkan",project:"Projek",education:"Pendidikan",experience:"Pengalaman"}:{skill:"Recorded skill",project:"Project",education:"Education",experience:"Experience"};
 const lines=evidence.map(e=>"- "+kinds[e.kind]+": "+e.label);
 if(ms)return [
  "Kepada Pengurus Pengambilan Pekerja, "+company,
  "PERMOHONAN JAWATAN: "+role,
  "Saya ingin mengemukakan permohonan bagi jawatan "+role+" di "+company+". Saya berminat untuk menerangkan bagaimana latar belakang saya boleh menyumbang kepada keperluan jawatan ini.",
  "Antara rekod dalam profil saya yang ingin saya kongsikan:",
  lines.join("\n"),
  "Saya mengalu-alukan peluang untuk membincangkan rekod tersebut, menunjukkan bukti kerja yang bersesuaian dan memahami keperluan pasukan dengan lebih lanjut.",
  "Terima kasih atas masa dan pertimbangan pihak tuan/puan.",
  "Yang benar,\n"+name
 ].join("\n\n");
 return [
  "Dear Hiring Manager, "+company,
  "APPLICATION FOR: "+role,
  "I would like to apply for the "+role+" position at "+company+". I welcome the opportunity to explain how my background relates to the requirements of the role.",
  "I would like to share the following records from my profile:",
  lines.join("\n"),
  "I would be pleased to discuss these records, share relevant work samples and learn more about the needs of your team.",
  "Thank you for your time and consideration.",
  "Kind regards,\n"+name
 ].join("\n\n");
}
