import {parseCareerReport,CAREER_DISCLOSURE,type ReportBlock} from "@/lib/career-report";
import {SUPPORT_ACKNOWLEDGEMENT} from "@/components/support-partners";
export type CareerReportMeta={role:string;date:string;model?:string;name?:string};
const xmlEsc=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
function rich(text:string){
 const segments=text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
 return segments.map(v=>{
  const bold=v.startsWith("**")&&v.endsWith("**");
  const italic=!bold&&v.startsWith("*")&&v.endsWith("*");
  const str=(bold?v.slice(2,-2):italic?v.slice(1,-1):v);
  return `<w:r><w:rPr>${bold?"<w:b/>":""}${italic?"<w:i/>":""}</w:rPr><w:t xml:space="preserve">${xmlEsc(str)}</w:t></w:r>`;
 }).join("");
}
const p=(s:string,style="Normal",extra="")=>`<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra}</w:pPr>${rich(s)}</w:p>`;
function blockXml(b:ReportBlock){
 if(b.type==="bullet"||b.type==="number")return p((b.type==="number"?"▸ ":"• ")+b.text,"ListText","<w:ind w:left=\"440\" w:hanging=\"240\"/>");
 if(b.type==="h1"||b.type==="h2"||b.type==="h3")return p(b.text,"Subheading");
 if(b.type==="quote")return p(b.text,"Quote");
 return p(b.text);
}
function crc32(bytes:Uint8Array){
 let crc=0xffffffff;
 for(const byte of bytes){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^(crc&1?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
function zipStore(files:Array<[string,string|Uint8Array]>):Blob{
 const te=new TextEncoder();
 const parts:Uint8Array[]=[];const central:Uint8Array[]=[];
 let offset=0;
 function u16(a:Uint8Array,o:number,v:number){a[o]=v&255;a[o+1]=(v>>>8)&255;}
 function u32(a:Uint8Array,o:number,v:number){u16(a,o,v&65535);u16(a,o+2,Math.floor(v/65536));}
 for(const [filename,content] of files){
  const name=te.encode(filename),bytes=typeof content==="string"?te.encode(content):content,sum=crc32(bytes);
  const header=new Uint8Array(30+name.length);u32(header,0,0x04034b50);u16(header,4,20);u16(header,6,0x0800);u16(header,8,0);u16(header,10,0);u16(header,12,0);u32(header,14,sum);u32(header,18,bytes.length);u32(header,22,bytes.length);u16(header,26,name.length);header.set(name,30);
  parts.push(header,bytes);
  const record=new Uint8Array(46+name.length);u32(record,0,0x02014b50);u16(record,4,20);u16(record,6,20);u16(record,8,0x0800);u16(record,10,0);u16(record,12,0);u16(record,14,0);u32(record,16,sum);u32(record,20,bytes.length);u32(record,24,bytes.length);u16(record,28,name.length);u16(record,30,0);u16(record,32,0);u16(record,34,0);u16(record,36,0);u32(record,38,0);u32(record,42,offset);record.set(name,46);central.push(record);
  offset+=header.length+bytes.length;
 }
 const centralSize=central.reduce((n,b)=>n+b.length,0);const end=new Uint8Array(22);u32(end,0,0x06054b50);u16(end,8,files.length);u16(end,10,files.length);u32(end,12,centralSize);u32(end,16,offset);
 return new Blob([...parts,...central,end] as BlobPart[],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}

/** Convert the local embedded partner-logo artwork into a Word-compatible PNG. */
async function partnerPng(asset:string):Promise<Uint8Array>{
 const response=await fetch(asset,{cache:"force-cache"});
 if(!response.ok)throw new Error("Logo sokongan projek tidak dapat dimuatkan untuk eksport Word.");
 const svg=await response.text();
 const embedded=svg.match(/href="data:image\/webp;base64,([^"]+)"/);
 if(!embedded)throw new Error("Fail logo sokongan projek tidak sah.");
 const raw=atob(embedded[1]);
 const bytes=Uint8Array.from(raw,ch=>ch.charCodeAt(0));
 const source=URL.createObjectURL(new Blob([bytes as BlobPart],{type:"image/webp"}));
 try{
  const image=new Image();image.src=source;await image.decode();
  const canvas=document.createElement("canvas");
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("Paparan grafik tidak disokong oleh browser.");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Tidak dapat menukar imej logo.")),"image/png"));
  return new Uint8Array(await blob.arrayBuffer());
 }finally{URL.revokeObjectURL(source)}
}
function inlinePicture(id:string,docPr:number,name:string,cx:number,cy:number){
 const t=xmlEsc(name);
 return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${docPr}" name="${t}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${docPr}" name="${t}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}
function partnerImagesRow(){
 return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="100" w:after="100"/></w:pPr>${inlinePicture("rId2",2,"TVETMARA Besut",2350000,457000)}<w:r><w:t xml:space="preserve">       </w:t></w:r>${inlinePicture("rId3",3,"DFK Incubator",1360000,780000)}</w:p>`;
}

export async function exportCareerDocx(report:string,meta:CareerReportMeta){
 const {intro,sections}=parseCareerReport(report);
 const date=meta.date;
 const body=[
  p("TALENTFOLIO AI  /  CAREER INTELLIGENCE","Eyebrow"),
  p("Skills & Career Growth Report","Title"),
  p("Analisis kemahiran, bukti pengalaman dan pelan pembangunan kerjaya berdasarkan maklumat yang disediakan oleh pemilik portfolio."),
  p(meta.role,"Subtitle"),
  p(`Tarikh laporan: ${date}   •   Analisis: ${meta.model||"Gemini AI"}`,"Metadata"),
  p("SOKONGAN PEMBANGUNAN PROJEK","Eyebrow"),
  partnerImagesRow(),
  p(SUPPORT_ACKNOWLEDGEMENT,"Note"),
  ...(intro.length?[p("Ringkasan Eksekutif","Heading"),...intro.map(blockXml)]:[]),
  p(`FOKUS KERJAYA: ${meta.role}  |  BAHAGIAN ANALISIS: ${sections.length} seksyen  |  SUMBER: Profil & Gemini AI`,"Metadata"),
  ...sections.flatMap(s=>[
   p(`${String(s.index).padStart(2,"0")}   ${s.title}`,"Heading"),
   ...s.blocks.map(blockXml)
  ]),
  p("Nota Ketelusan — "+CAREER_DISCLOSURE,"Note")
 ].join("");
 const document=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1100" w:bottom="1000" w:left="1100"/></w:sectPr></w:body></w:document>`;
 const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:color w:val="28364D"/><w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults>
 <w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="125" w:line="310" w:lineRule="auto"/></w:pPr></w:style>
 <w:style w:type="paragraph" w:styleId="Eyebrow"><w:name w:val="Eyebrow"/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:color w:val="476EE7"/><w:sz w:val="18"/><w:b/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="180"/></w:pPr><w:rPr><w:color w:val="14223B"/><w:sz w:val="48"/><w:b/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:color w:val="476EE7"/><w:sz w:val="30"/><w:b/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="Metadata"><w:name w:val="Metadata"/><w:pPr><w:spacing w:after="280"/></w:pPr><w:rPr><w:color w:val="68788E"/><w:sz w:val="18"/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="Heading"><w:name w:val="Heading"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="170"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:color="DCE5F6" w:space="8"/></w:pBdr></w:pPr><w:rPr><w:color w:val="1D3455"/><w:sz w:val="28"/><w:b/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="Subheading"><w:name w:val="Subheading"/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="90"/></w:pPr><w:rPr><w:color w:val="3251A3"/><w:sz w:val="23"/><w:b/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="ListText"><w:name w:val="ListText"/><w:pPr><w:spacing w:after="145"/></w:pPr></w:style>
 <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:pPr><w:spacing w:after="160"/><w:ind w:left="350"/></w:pPr><w:rPr><w:i/><w:color w:val="546E9A"/></w:rPr></w:style>
 <w:style w:type="paragraph" w:styleId="Note"><w:name w:val="Note"/><w:pPr><w:spacing w:before="320"/></w:pPr><w:rPr><w:sz w:val="17"/><w:color w:val="7C8A9D"/><w:i/></w:rPr></w:style>
 </w:styles>`;
 const types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
 const rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
 const drels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/tvetmara-besut.png"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/dfk-incubator.png"/></Relationships>';
 const core=`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Talentfolio AI - Analisis Kemahiran &amp; Kerjaya</dc:title><dc:creator>Talentfolio AI</dc:creator><dc:description>Analisis Gemini berdasarkan penilaian kendiri</dc:description></cp:coreProperties>`;
 const [tvetLogo,dfkLogo]=await Promise.all([partnerPng("/partners/tvetmara-besut.svg"),partnerPng("/partners/dfk-incubator.svg")]);
 return zipStore([["word/media/tvetmara-besut.png",tvetLogo],["word/media/dfk-incubator.png",dfkLogo],["[Content_Types].xml",types],["_rels/.rels",rels],["word/document.xml",document],["word/_rels/document.xml.rels",drels],["word/styles.xml",styles],["docProps/core.xml",core]]);
}
export async function downloadCareerDocx(report:string,meta:CareerReportMeta){
 const blob=await exportCareerDocx(report,meta);
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download="Talentfolio_AI_Career_Analysis_"+new Date().toISOString().slice(0,10)+".docx";document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
