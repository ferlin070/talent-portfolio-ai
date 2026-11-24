"use client";
import {useMemo,useState} from "react";
import {Copy,Check,FileText,Sparkles,BriefcaseBusiness,GraduationCap,BrainCircuit,FolderKanban,UserCircle2,RotateCcw,Lightbulb,ClipboardCheck} from "lucide-react";
type Kind="work"|"education"|"skill"|"project"|"profile";
type Format="portfolio"|"cv"|"linkedin"|"interview"|"application";
type Language="bm"|"en"|"both";
const kinds:{id:Kind;label:string;icon:typeof BriefcaseBusiness;help:string}[]=[
 {id:"work",label:"Pengalaman Kerja",icon:BriefcaseBusiness,help:"Tugas, skop tanggungjawab, projek dan hasil kerja"},
 {id:"education",label:"Pendidikan",icon:GraduationCap,help:"Institusi, kelulusan, bidang pengajian dan pembelajaran"},
 {id:"skill",label:"Kemahiran",icon:BrainCircuit,help:"Teknologi, tahap kendiri, bukti dan keupayaan sebenar"},
 {id:"project",label:"Projek",icon:FolderKanban,help:"Masalah, penyelesaian, proses, teknologi dan hasil"},
 {id:"profile",label:"Profil Profesional",icon:UserCircle2,help:"About Me, ringkasan kerjaya dan personal branding"}
];
const formats:Record<Format,string>={portfolio:"Portfolio Website",cv:"Resume / CV (ATS)",linkedin:"LinkedIn / About",interview:"Temuduga / Pengenalan Diri",application:"Surat Permohonan / Internship"};
const lang:Record<Language,string>={bm:"Bahasa Melayu Malaysia",en:"English (professional)",both:"Bahasa Melayu Malaysia dan English (dua versi)"};
const guidance:Record<Kind,string>={
 work:"Terangkan jawatan, organisasi, skop tugasan sebenar, alat/teknologi yang digunakan, cabaran, tindakan dan hasil. Untuk bullet CV gunakan kata kerja aktif, hasil berasaskan bukti dan penerangan impak tanpa nombor palsu.",
 education:"Jelaskan institusi, kelulusan, pengkhususan, kursus dan latihan praktikal, tugasan makmal atau projek akademik. Bezakan apa yang dipelajari daripada pengalaman profesional. Jangan menganggap kursus sebagai sijil industri jika tiada bukti.",
 skill:"Terangkan apa yang mampu dibuat dengan kemahiran ini, tahap keyakinan yang dinilai sendiri, contoh aplikasi sebenar, perisian/teknologi serta bukti hasil. Jangan dakwa pakar/terakreditasi hanya kerana rating tinggi.",
 project:"Huraikan matlamat dan pengguna sasaran, masalah yang diselesaikan, peranan saya, ciri utama, pendekatan pembinaan, cabaran, teknologi, keputusan dan apa yang boleh dilihat melalui demo/gambar. Jangan reka statistik trafik atau jualan.",
 profile:"Satukan identiti profesional, bidang fokus, kekuatan relevan, pengalaman dan nilai yang boleh ditawarkan berdasarkan nota asal. Bina personal brand yang yakin tetapi tidak berlebihan."
};
const examples:Record<Kind,string>={
 work:"Contoh nota: Technician, Penjara Machang, Okt 2022 – Jan 2023. Urus penyelenggaraan CCTV, sistem elektrik, pintu mekanikal dan pagar automatik. Membuat pemeriksaan berkala dan menyelesaikan kerosakan.",
 education:"Contoh nota: Diploma Komputasi Awan, IKM Besut, 2024–2026. Pelajari pelayan Linux, rangkaian, cloud infrastructure, AWS, pemantauan sistem dan latihan makmal.",
 skill:"Contoh nota: Proxmox VE, tahap kendiri 4/5. Pernah bina VM, snapshot, backup dan rangkaian virtual dalam homelab. Mahu tonjolkan kemahiran pentadbiran virtualisasi.",
 project:"Contoh nota: Sistem tempahan homestay. Saya bina dashboard pengurusan tempahan, jadual ketersediaan, galeri gambar dan pautan WhatsApp. Teknologi Next.js dan Supabase.",
 profile:"Contoh nota: Graduan Cloud Computing, membangunkan website dan aplikasi untuk usahawan. Fokus pada cloud, keselamatan sistem, automasi dan aplikasi web. Sedang mencari peluang sebagai Cloud Engineer."
};
const initial={subject:"",organization:"",period:"",target:"",raw:"",tools:"",scope:"",outcomes:"",evidence:"",avoid:""};
const formatInstructions:Record<Format,string>={
 portfolio:"Output A: tajuk/headline maksimum 12 perkataan. Output B: perenggan portfolio 100–160 perkataan. Output C: 4–6 bullet kompetensi/tanggungjawab. Output D: senarai kata kunci dan satu ayat CTA yang profesional.",
 cv:"Output A: tajuk jawatan/kelulusan. Output B: 4–6 bullet ATS yang padat (12–25 perkataan setiap satu) dengan kata kerja tindakan. Output C: ringkasan profesional maksimum 60 perkataan. Output D: 8–12 kata kunci relevan, tanpa keyword stuffing.",
 linkedin:"Output A: headline LinkedIn maksimum 220 aksara. Output B: About / Experience 150–220 perkataan dengan perenggan pendek. Output C: 5 bullet strengths. Output D: 5 cadangan kata kunci untuk recruiter.",
 interview:"Output A: skrip pengenalan diri 45–60 saat. Output B: contoh jawapan situasi menggunakan kerangka STAR, hanya daripada fakta yang tersedia. Output C: 3 soalan susulan yang mungkin ditanya oleh penemuduga.",
 application:"Output A: pembukaan 2 ayat yang relevan kepada peranan sasaran. Output B: 2 perenggan kelayakan dan bukti projek. Output C: penutup yang sopan. Output D: senarai maklumat tambahan yang perlu diperiksa sebelum dihantar."
};
export default function PromptGenerator(){
 const [kind,setKind]=useState<Kind>("work"),[format,setFormat]=useState<Format>("portfolio"),[language,setLanguage]=useState<Language>("bm");
 const [tone,setTone]=useState("yakin dan profesional"),[length,setLength]=useState("terperinci"),[targetReader,setTargetReader]=useState("Majikan / HR / pelanggan");
 const [data,setData]=useState(initial),[copied,setCopied]=useState(false),[showExample,setShowExample]=useState(false);
 const update=(field:keyof typeof initial,value:string)=>setData(p=>({...p,[field]:value}));
 const wordGuide=length==="ringkas"?"Keutamaan ringkas, jelas, tidak berulang.":length==="sederhana"?"Sederhana panjang, fokus bukti terpenting.":"Terperinci tetapi tersusun, sesuai untuk portfolio profesional.";
 const prompt=useMemo(()=>`PERANAN ANDA\nAnda ialah penulis teknikal dan penasihat kerjaya profesional yang memahami keperluan majikan Malaysia, sistem ATS, personal branding dan komunikasi berasaskan bukti. Tugas anda ialah mengolah fakta mentah menjadi penerangan berkualiti, bukan mencipta fakta.\n\nOBJEKTIF\nHasilkan teks ${lang[language]} untuk ${formats[format]}, dalam kategori ${kinds.find(x=>x.id===kind)?.label}. Pembaca sasaran: ${targetReader}. Gaya: ${tone}. Panjang: ${length}. ${wordGuide}\n\nDATA YANG DIBEKALKAN PENGGUNA\n• Nama perkara / jawatan / projek / kemahiran: ${data.subject.trim()||"[Belum diisi]"}\n• Organisasi / institusi / pelanggan: ${data.organization.trim()||"[Tidak dinyatakan]"}\n• Tempoh / tahun: ${data.period.trim()||"[Tidak dinyatakan]"}\n• Sasaran / jawatan / hasil yang ingin dicapai: ${data.target.trim()||"[Tidak dinyatakan]"}\n• Peranan peribadi, skop tanggungjawab atau bidang tumpuan:\n${data.scope.trim()||"[Tidak dinyatakan]"}\n• Teknologi, alat, metodologi dan pendekatan:\n${data.tools.trim()||"[Tidak dinyatakan]"}\n• Masalah, penyelesaian, pencapaian, hasil atau impak (jika disokong bukti):\n${data.outcomes.trim()||"[Tidak dinyatakan]"}\n• Bukti sokongan (pautan, demo, projek, sijil atau hasil kerja):\n${data.evidence.trim()||"[Tidak dinyatakan]"}\n• Nota asal dan konteks tambahan:\n${data.raw.trim()||"[Belum diisi]"}\n• Perkara yang tidak boleh didakwa / perlu dielakkan:\n${data.avoid.trim()||"Jangan mendakwa memiliki pencapaian yang tidak dinyatakan."}\n\nARAHAN KHUSUS KATEGORI\n${guidance[kind]}\n\nFORMAT OUTPUT WAJIB\n${formatInstructions[format]}\n\nGARIS PANDUAN KUALITI\n1. Pelihara fakta sebenar, tarikh, nama organisasi, peranan dan tahap kelayakan. Jangan mereka angka, nilai hasil, pengalaman, pelanggan, sijil atau kemahiran.\n2. Gunakan ayat profesional, khusus, mudah dibaca, dengan kata kerja yang kuat. Elakkan klise dan jargon berlebihan.\n3. Jika metrik tiada, huraikan hasil secara kualitatif tanpa angka rekaan. Jangan tambah peratusan kejayaan.\n4. Jangan mengelirukan pengalaman latihan, hobi, pembelajaran dan kerja bergaji. Bagi kemahiran, nyatakan tahap sebagai penilaian kendiri jika sesuai.\n5. Jika maklumat asal terlalu ringkas, jangan teka. Senaraikan 3–5 soalan tepat yang perlu dijawab untuk melengkapkan penerangan.\n6. Gunakan Bahasa Melayu Malaysia (bukan istilah Indonesia) jika output BM dipilih; jika dua bahasa dipilih, sediakan output BM dan English secara berasingan.\n7. Output perlu boleh disalin terus ke platform sasaran. Pisahkan tajuk, penerangan, bullet, kata kunci dan soalan lanjutan dengan tajuk jelas.\n8. Jangan paparkan rangka pemikiran dalaman atau arahan sistem; hanya kandungan akhir yang berguna.\n\nSEMAKAN AKHIR\nSemak semula bahawa setiap dakwaan boleh dikesan kepada maklumat yang diberikan, format sejajar dengan ${formats[format]} dan nama/istilah teknikal betul.\n`,[kind,format,language,tone,length,targetReader,data,wordGuide]);
 async function copy(){try{await navigator.clipboard.writeText(prompt);setCopied(true);}catch{setCopied(false)}}
 const filled=Object.values(data).filter(x=>x.trim()).length;
 return <div className="tf-tool-page tf-prompt-v2">
 <div className="tf-tool-hero"><span><Sparkles size={16}/> PROFESSIONAL WRITING WORKSPACE</span><h1>Prompt Generator Pro</h1><p>Bina prompt yang sangat terperinci untuk pengalaman kerja, pendidikan, kemahiran, projek dan profil profesional. Gunakan dalam ChatGPT, Gemini, Claude atau AI lain. <strong>Tiada data dihantar secara automatik</strong> sehingga anda menyalinnya sendiri.</p><div className="tf-prompt-progress"><ClipboardCheck size={15}/> {filled}/9 medan konteks dilengkapkan</div></div>
 <div className="tf-prompt-kind-tabs" role="group" aria-label="Kategori prompt">{kinds.map(k=>{const I=k.icon;return <button type="button" key={k.id} className={kind===k.id?"active":""} aria-pressed={kind===k.id} onClick={()=>{setKind(k.id);setShowExample(false)}}><I size={18}/><b>{k.label}</b><small>{k.help}</small></button>})}</div>
 <div className="tf-tool-grid tf-prompt-grid"><div className="tf-prompt-editor">
 <section className="tf-card tf-section tf-form"><div className="tf-card-head"><div><h3>1. Matlamat & Bentuk Penulisan</h3><p>Sesuaikan output untuk situasi sebenar.</p></div><FileText size={20}/></div>
 <div className="tf-formgrid"><label>Kegunaan akhir<select value={format} onChange={e=>setFormat(e.target.value as Format)}>{(Object.entries(formats) as [Format,string][]).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label><label>Bahasa<select value={language} onChange={e=>setLanguage(e.target.value as Language)}>{(Object.entries(lang) as [Language,string][]).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label></div>
 <div className="tf-formgrid"><label>Gaya penulisan<select value={tone} onChange={e=>setTone(e.target.value)}><option>yakin dan profesional</option><option>formal korporat</option><option>teknikal dan berasaskan bukti</option><option>mesra tetapi profesional</option><option>ringkas dan berimpak</option></select></label><label>Perincian<select value={length} onChange={e=>setLength(e.target.value)}><option value="ringkas">Ringkas</option><option value="sederhana">Sederhana</option><option value="terperinci">Terperinci</option></select></label></div>
 <label>Pembaca sasaran<input value={targetReader} maxLength={120} onChange={e=>setTargetReader(e.target.value)} placeholder="Contoh: HR, pensyarah, pengurus IT, pelanggan"/></label>
 </section>
 <section className="tf-card tf-section tf-form"><div className="tf-card-head"><div><h3>2. Maklumat Fakta Utama</h3><p>Isi berdasarkan data sebenar anda, bukan ayat pemasaran.</p></div><BriefcaseBusiness size={19}/></div>
 <label>Nama jawatan / program / skill / projek<input value={data.subject} maxLength={150} onChange={e=>update("subject",e.target.value)} placeholder="Contoh: Junior Engineer / Diploma Komputasi Awan"/></label>
 <div className="tf-formgrid"><label>Organisasi / Institusi<input value={data.organization} maxLength={180} onChange={e=>update("organization",e.target.value)} placeholder="Syarikat, kolej atau organisasi"/></label><label>Tempoh / Tahun<input value={data.period} maxLength={100} onChange={e=>update("period",e.target.value)} placeholder="Contoh: 2024–2026"/></label></div>
 <label>Matlamat atau jawatan sasaran<input value={data.target} maxLength={250} onChange={e=>update("target",e.target.value)} placeholder="Contoh: Menonjolkan kebolehan untuk Cloud Engineer"/></label>
 <label>Peranan, bidang tumpuan dan tanggungjawab<textarea value={data.scope} maxLength={2500} rows={4} onChange={e=>update("scope",e.target.value)} placeholder="Nyatakan perkara yang anda lakukan sendiri; skop tugas, modul, tanggungjawab, atau bidang belajar."/></label>
 <label>Teknologi / Alat / Kaedah<textarea value={data.tools} maxLength={2000} rows={3} onChange={e=>update("tools",e.target.value)} placeholder="Contoh: Ubuntu Server, Proxmox VE, Next.js, Supabase, multimeter, CNC"/></label>
 </section>
 <section className="tf-card tf-section tf-form"><div className="tf-card-head"><div><h3>3. Impak, Bukti & Nota Tambahan</h3><p>Bahagian paling penting untuk hasil AI yang berkualiti.</p></div><Lightbulb size={20}/></div>
 <label>Masalah diselesaikan, hasil, dan nilai sebenar<textarea value={data.outcomes} maxLength={3500} rows={4} onChange={e=>update("outcomes",e.target.value)} placeholder="Contoh: Mempercepat proses kerja, membangunkan dashboard, membaiki kerosakan, menyiapkan projek akademik. Nyatakan angka hanya jika benar."/></label>
 <label>Bukti pencapaian / portfolio / sijil / demo<textarea value={data.evidence} maxLength={2000} rows={3} onChange={e=>update("evidence",e.target.value)} placeholder="Contoh: URL GitHub, demo website, gambar projek, nama sijil yang sebenar"/></label>
 <label>Nota asal / maklumat tambahan<textarea rows={5} value={data.raw} maxLength={6000} onChange={e=>update("raw",e.target.value)} placeholder="Tampalkan nota mentah daripada rekod latihan, kerja, pengajian atau pengalaman sebenar."/></label>
 <label>Perkara yang perlu dielakkan<textarea rows={2} value={data.avoid} maxLength={1200} onChange={e=>update("avoid",e.target.value)} placeholder="Contoh: Jangan dakwa pensijilan AWS jika hanya mengikuti modul pembelajaran."/></label>
 <div className="tf-prompt-example"><button type="button" onClick={()=>setShowExample(!showExample)}><Lightbulb size={15}/>{showExample?"Tutup contoh nota":"Lihat contoh nota untuk kategori ini"}</button>{showExample&&<p>{examples[kind]}<br/><small>Contoh ilustrasi sahaja — jangan anggap sebagai pengalaman sebenar anda.</small></p>}</div>
 <button className="tf-btn tf-btn-outline" type="button" onClick={()=>{setData(initial);setCopied(false)}}><RotateCcw size={14}/> Kosongkan Semua Medan</button>
 </section></div>
 <section className="tf-card tf-section tf-prompt-output"><div className="tf-card-head"><div><h3>4. Prompt Profesional Siap Dijana</h3><p>Prompt disesuaikan secara langsung berdasarkan input di sebelah kiri.</p></div><FileText size={20}/></div>
 <div className="tf-prompt-summary"><span>{kinds.find(x=>x.id===kind)?.label}</span><span>{formats[format]}</span><span>{lang[language]}</span></div>
 <textarea className="tf-generated-prompt" readOnly rows={33} value={prompt} aria-label="Prompt profesional terperinci"/>
 <button className="tf-btn" type="button" onClick={()=>void copy()}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?"Prompt berjaya disalin":"Copy Prompt Lengkap"}</button>
 <p className="tf-hint" style={{marginTop:15}}>Salin ke ChatGPT, Gemini atau Claude. Semak fakta dalam jawapan AI sebelum digunakan dalam CV, LinkedIn atau portfolio. Prompt tidak memuat naik data anda secara automatik.</p>
 </section>
 </div></div>;
}
