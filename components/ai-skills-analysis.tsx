"use client";
import {useMemo,useState,useEffect} from "react";
import {BrainCircuit,Copy,Sparkles,KeyRound,Plus,Trash2,Eye,EyeOff,ShieldCheck,AlertTriangle,RotateCcw,CheckCircle2,LockKeyhole,Save,Unlock,ShieldOff} from "lucide-react";
import Link from "next/link";
import {getSupabaseClient} from "@/lib/supabase";
import CareerReport from "@/components/career-report";
import {encryptVault,decryptVault,vaultStorageKey,type VaultEnvelope} from "@/lib/gemini-key-vault";
type Entry={id:number;label:string;secret:string;visible:boolean};
type Attempt={slot:number;status:string;httpStatus?:number;retryCount?:number};
const MAX_KEYS=5;
const MODELS=[{id:"gemini-3.5-flash-lite",label:"Gemini 3.5 Flash-Lite · Disyorkan"},{id:"gemini-3.6-flash",label:"Gemini 3.6 Flash"},{id:"gemini-3.8-flash",label:"Gemini 3.8 Flash"}];
export default function AIAnalysis({role,skills}:{role:string;skills:{name:string;self_rating:number|null}[]}){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [keys,setKeys]=useState<Entry[]>([{id:1,label:"Gemini Key 1",secret:"",visible:false}]);
 const [model,setModel]=useState("gemini-3.5-flash-lite"),[consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false),[result,setResult]=useState(""),[error,setError]=useState("");
 const [attempts,setAttempts]=useState<Attempt[]>([]),[usedSlot,setUsedSlot]=useState<number|null>(null),[copied,setCopied]=useState(false);
 const [vaultOwner,setVaultOwner]=useState<string|null>(null);
 const [vaultExists,setVaultExists]=useState(false),[vaultPassphrase,setVaultPassphrase]=useState(""),[vaultBusy,setVaultBusy]=useState(false),[vaultMessage,setVaultMessage]=useState("");
 useEffect(()=>{let live=true;void db.auth.getUser().then(({data})=>{
  if(!live)return;
  const id=data.user?.id||null;setVaultOwner(id);
  if(id){try{setVaultExists(localStorage.getItem(vaultStorageKey(id))!==null)}catch{setVaultMessage("Storan peranti tidak tersedia. Gunakan key dalam sesi sahaja.");}}
 });return()=>{live=false}},[db]);
 async function saveVault(){
  if(!vaultOwner){setVaultMessage("Log masuk untuk menyimpan key secara peribadi.");return;}
  if(vaultPassphrase.length<12){setVaultMessage("Gunakan kata laluan vault sekurang-kurangnya 12 aksara.");return;}
  setVaultBusy(true);setVaultMessage("");
  try{
   const filled=keys.filter(k=>k.secret.trim()).map(k=>({label:k.label.trim()||"Gemini API Key",secret:k.secret.trim()}));
   const encrypted=await encryptVault(vaultPassphrase,filled);
   localStorage.setItem(vaultStorageKey(vaultOwner),JSON.stringify(encrypted));
   setVaultExists(true);setVaultPassphrase("");setVaultMessage("✓ API key disimpan secara terenkripsi pada peranti ini. Masukkan kata laluan vault untuk membuka semula selepas refresh.");
  }catch(e){setVaultMessage(e instanceof Error?e.message:"Tidak dapat menyimpan vault.");}
  finally{setVaultBusy(false)}
 }
 async function unlockVault(){
  if(!vaultOwner)return;
  setVaultBusy(true);setVaultMessage("");
  try{
   const raw=localStorage.getItem(vaultStorageKey(vaultOwner));
   if(!raw)throw Error("Tiada key tersimpan pada peranti ini.");
   const restored=await decryptVault(vaultPassphrase,JSON.parse(raw) as VaultEnvelope);
   setKeys(restored.map((x,i)=>({id:i+1,label:x.label,secret:x.secret,visible:false})));
   setVaultPassphrase("");setVaultMessage("✓ Semua API key berjaya dibuka. Anda boleh menjalankan analisis Gemini.");
  }catch{setVaultMessage("Tidak dapat membuka vault. Semak kata laluan, atau padam vault dan simpan key baharu.");}
  finally{setVaultBusy(false)}
 }
 function deleteVault(){
  if(!vaultOwner||!confirm("Padam semua API key tersimpan pada peranti ini? Ini tidak membatalkan key di Google AI Studio."))return;
  try{localStorage.removeItem(vaultStorageKey(vaultOwner));setVaultExists(false);setVaultPassphrase("");setVaultMessage("Vault setempat telah dipadam. Key dalam borang masih ada sehingga refresh.");}
  catch{setVaultMessage("Gagal memadam vault setempat.");}
 }
 const [roundRobin,setRoundRobin]=useState(0);
 const [testing,setTesting]=useState(false),[testMessage,setTestMessage]=useState("");
 const valid=keys.map(k=>k.secret.trim()).filter(s=>s.length>=15);
 const analysisPrompt=`Anda ialah penasihat pembangunan kerjaya di Malaysia. Jawatan sasaran saya: ${role}. Penilaian kemahiran berikut adalah penilaian kendiri sahaja:\n${skills.map(s=>`• ${s.name} — ${s.self_rating??"Belum dinilai"}/5`).join("\n")}\n\nBuat ringkasan kekuatan, matriks jurang kemahiran, roadmap 30/60/90 hari, cadangan projek bukti kerja dan kursus. Jangan reka pengalaman atau sijil; tanya jika data tidak mencukupi. Bahasa Melayu Malaysia.`;
 const change=(id:number,field:"secret"|"label"|"visible",value:string|boolean)=>setKeys(prev=>prev.map(x=>x.id===id?{...x,[field]:value}:x));
 async function analyze(){
  if(!consent||valid.length===0)return;
  setBusy(true);setError("");setResult("");setAttempts([]);setUsedSlot(null);
  try{
   const {data:{session},error:sessionError}=await db.auth.getSession();
   if(sessionError||!session)throw Error("Sesi tidak sah. Sila log masuk semula.");
   const ordered=[...valid.slice(roundRobin%valid.length),...valid.slice(0,roundRobin%valid.length)];
   const response=await fetch("/api/skills/analyze",{
    method:"POST",cache:"no-store",
    headers:{"content-type":"application/json",Authorization:`Bearer ${session.access_token}`},
    body:JSON.stringify({role,apiKeys:ordered,model,consent:true})
   });
   const data=await response.json() as {analysis?:string;error?:string;usedKeySlot?:number;attempts?:Attempt[];model?:string};
   setAttempts(data.attempts||[]);
   if(!response.ok)throw Error(data.error||"Gemini tidak dapat menjana analisis.");
   setResult(data.analysis||"");
   const slot=data.usedKeySlot||1;
   setUsedSlot(((roundRobin+slot-1)%valid.length)+1);
   setRoundRobin(v=>(v+slot)%valid.length);
  }catch(e){setError(e instanceof Error?e.message:"Gagal menghubungi Gemini.");}finally{setBusy(false)}
 }
 async function testConnection(){
  const first=keys.find(k=>k.secret.trim().length>=15);
  if(!first)return;
  setTesting(true);setTestMessage("");
  try{
   const {data:{session}}=await db.auth.getSession();
   if(!session)throw new Error("Sila log masuk semula.");
   const response=await fetch("/api/skills/test-connection",{method:"POST",cache:"no-store",
    headers:{"content-type":"application/json",Authorization:`Bearer ${session.access_token}`},
    body:JSON.stringify({apiKey:first.secret.trim(),model})});
   const data=await response.json() as {message?:string;error?:string;seconds?:number;httpStatus?:number};
   setTestMessage(response.ok?`✓ ${data.message||"Berjaya"} (${data.seconds??0}s)`:
    `✕ ${data.error||"Ujian tidak berjaya."} ${data.httpStatus?"HTTP "+data.httpStatus:""}`);
  }catch(e){setTestMessage(e instanceof Error?e.message:"Ujian sambungan gagal.");}
  finally{setTesting(false)}
 }
 async function copy(text:string){try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setError("Gagal menyalin ke clipboard. Sila semak kebenaran browser.");}}
 return <section className="tf-card tf-section tf-ai-panel">
  <div className="tf-card-head"><div><h3><BrainCircuit size={21}/> Gemini Skills Intelligence</h3><p>Analisis kerjaya menggunakan API Gemini anda sendiri, berdasarkan rekod dalam akaun Talentfolio AI.</p></div><span className="tf-pill"><KeyRound size={13}/> Bring Your Own Key</span></div>
  <div className="tf-gemini-intro"><ShieldCheck size={19}/><p><strong>API key milik pengguna.</strong> Anda boleh memasukkan sehingga 5 key. Secara lalai, key hanya berada dalam memori tab. Anda kini boleh memilih <strong>Simpan Terenkripsi pada Peranti</strong> untuk mengekalkannya selepas refresh atau kemas kini website. Key terenkripsi disimpan dalam browser, bukan Supabase atau GitHub. Kata laluan vault tidak disimpan; anda perlu memasukkannya untuk membuka semula key. Key hanya dihantar melalui HTTPS ke backend semasa panggilan Gemini.</p></div>
  <div className="tf-gemini-heading"><h4>1. Pengurusan Gemini API Key</h4><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Dapatkan API key di Google AI Studio ↗</a></div>
  <div className="tf-gemini-key-list">{keys.map((k,i)=><div key={k.id} className="tf-gemini-key-row">
   <span className="tf-gemini-index">#{i+1}</span>
   <div className="tf-gemini-key-input"><label htmlFor={`tf-key-${k.id}`}>Label API Key</label><input aria-label="Nama key" value={k.label} maxLength={40} onChange={e=>change(k.id,"label",e.target.value)}/></div>
   <div className="tf-gemini-secret"><label htmlFor={`tf-key-${k.id}`}>Gemini API Key</label><div><input id={`tf-key-${k.id}`} type={k.visible?"text":"password"} autoComplete="off" spellCheck={false} value={k.secret} onChange={e=>change(k.id,"secret",e.target.value)} placeholder="Masukkan key anda secara manual"/><button type="button" aria-label={k.visible?"Sembunyikan key":"Lihat key"} onClick={()=>change(k.id,"visible",!k.visible)}>{k.visible?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>
   <button type="button" title="Buang key" aria-label={`Buang key ${i+1}`} disabled={keys.length===1||busy} onClick={()=>setKeys(prev=>prev.filter(x=>x.id!==k.id))}><Trash2 size={17}/></button>
  </div>)}</div>
  <div className="tf-gemini-add"><button type="button" className="tf-btn tf-btn-outline" disabled={keys.length>=MAX_KEYS||busy} onClick={()=>setKeys(prev=>[...prev,{id:Math.max(...prev.map(x=>x.id))+1,label:`Gemini Key ${prev.length+1}`,secret:"",visible:false}])}><Plus size={15}/> Tambah API Key ({keys.length}/{MAX_KEYS})</button><small>{valid.length} key telah diisi · Satu key akan digunakan untuk setiap percubaan. Key lain dicuba jika had kuota atau ralat penyedia berlaku.</small></div>
  <div className="tf-gemini-vault">
   <div className="tf-gemini-vault-title"><LockKeyhole size={19}/><div><h4>Simpan API Key (Terenkripsi pada Peranti)</h4><p>{vaultExists?"Vault tersimpan pada browser ini. Ia akan kekal selepas refresh/deployment.":"Belum ada key disimpan. Simpan secara pilihan supaya tidak perlu tampal semula setiap kali."}</p></div></div>
   <p className="tf-gemini-vault-note">Key disulitkan dengan AES-GCM dan kata laluan pilihan anda. Storan ini hanya tersedia pada browser/peranti dan akaun yang sama. Jika anda memadam data browser, bertukar peranti atau terlupa kata laluan, key tidak dapat dipulihkan daripada vault. Jangan gunakan peranti awam.</p>
   <label className="tf-gemini-vault-input">Kata laluan vault (minimum 12 aksara)<input type="password" autoComplete="new-password" minLength={12} value={vaultPassphrase} onChange={e=>setVaultPassphrase(e.target.value)} placeholder="Kata laluan khusus untuk melindungi key"/></label>
   <div className="tf-gemini-vault-actions"><button type="button" className="tf-btn" disabled={!vaultOwner||vaultBusy||!valid.length||vaultPassphrase.length<12} onClick={()=>void saveVault()}><Save size={15}/>{vaultBusy?"Memproses...":"Simpan Key Terenkripsi"}</button>
    {vaultExists&&<button type="button" className="tf-btn tf-btn-outline" disabled={vaultBusy||vaultPassphrase.length===0} onClick={()=>void unlockVault()}><Unlock size={15}/>Buka Key Tersimpan</button>}
    {vaultExists&&<button type="button" className="tf-btn tf-btn-outline" disabled={vaultBusy} onClick={deleteVault}><ShieldOff size={15}/>Padam Vault</button>}
   </div>
   {vaultMessage&&<p role="status" className="tf-gemini-vault-message">{vaultMessage}</p>}
  </div>
  <div className="tf-gemini-settings"><div><h4>2. Pilihan model & sasaran</h4><p>Jawatan sasaran: <strong>{role}</strong></p></div><label>Model Gemini<select value={model} onChange={e=>setModel(e.target.value)} disabled={busy}>{MODELS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label></div>
  <div className="tf-gemini-quota"><AlertTriangle size={18}/><p><strong>Kuota tidak semestinya bertambah dengan banyak key.</strong> Google menetapkan kebanyakan had penggunaan mengikut projek Google Cloud, bukan setiap key. Jika semua key daripada projek sama, bertukar key mungkin tidak menyelesaikan had kuota. Pastikan penggunaan setiap key mematuhi polisi Google dan tetapan billing anda.</p></div>
  <label className="tf-ai-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Saya faham API key saya akan dihantar ke pelayan Talentfolio AI untuk panggilan Gemini, dan data kemahiran, projek, pendidikan, pengalaman serta nama sijil saya akan dihantar kepada Google untuk dianalisis. Saya bersetuju meneruskan.</label>
  <div className="tf-gemini-run"><button type="button" className="tf-btn tf-btn-outline" disabled={busy||testing||valid.length===0} onClick={()=>void testConnection()}><KeyRound size={15}/>{testing?"Menguji sambungan...":"Uji Sambungan Gemini"}</button><button className="tf-btn" type="button" disabled={busy||!consent||valid.length===0||skills.length===0} onClick={()=>void analyze()}><Sparkles size={16}/>{busy?"Gemini sedang menganalisis…":"Generate Skills Analysis (Gemini)"}</button><span>{!valid.length?"Masukkan sekurang-kurangnya 1 API key.":!consent?"Tandakan persetujuan sebelum menjana analisis.":"Sedia menjana analisis berdasarkan profil anda."}</span></div>
  {testMessage&&<p role="status" className="tf-hint" style={{marginBottom:15}}>{testMessage}</p>}
  {error&&<div className="tf-ai-error" role="alert">{error}{!!attempts.length&&<ul>{attempts.map(a=><li key={a.slot}>Percubaan key #{a.slot}{a.httpStatus?` · HTTP ${a.httpStatus}`:""}: {a.status}</li>)}</ul>}</div>}
  {result&&<><CareerReport text={result} role={role} model={model} usedSlot={usedSlot} onCopy={()=>void copy(result)}/>{attempts.length>0&&<p className="tf-hint">Key sebelumnya tidak berjaya: {attempts.map(a=>`#${a.slot} (${a.status})`).join(", ")}</p>}</>}
  <div className="tf-gemini-fallback"><div><strong>Tiada API key? Gunakan AI pilihan anda.</strong><p>Anda masih boleh salin prompt analisis profesional dan tampal dalam ChatGPT, Gemini atau Claude tanpa sambungan API pada website.</p></div><button className="tf-btn tf-btn-outline" type="button" onClick={()=>void copy(analysisPrompt)}><Copy size={14}/>{copied?"Disalin":"Salin Prompt Analisis"}</button><Link href="/prompt-generator">Buka Prompt Generator</Link></div>
  <p className="tf-muted">Gemini memberikan cadangan berdasarkan data kendiri; ia tidak mengesahkan sijil atau tahap kemahiran. Setiap panggilan API tertakluk kepada kuota dan caj akaun Google anda.</p>
 </section>;
}
