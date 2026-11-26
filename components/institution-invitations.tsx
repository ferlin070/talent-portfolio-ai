"use client";
import {useEffect,useState} from "react";
import {Mail,Copy,ShieldCheck} from "lucide-react";
import {getSupabaseClient} from "@/lib/supabase";
const roleName=(r:string)=>r==="lecturer"?"Pensyarah":"Pelajar";
const statusName:Record<string,string>={pending:"Menunggu",accepted:"Diterima",revoked:"Dibatalkan",expired:"Tamat tempoh"};
type History={invite_id:string;recipient_email:string;invite_role:string;valid_until:string;invite_status:string};
type Preview={institution_name:string;invite_role:string;valid_until:string};
type Issued={invite_id:string;invite_token:string;valid_until:string};
const date=(s:string)=>new Intl.DateTimeFormat("ms-MY",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kuala_Lumpur"}).format(new Date(s))+" MYT";
async function verifiedUser(userId:string){const db=getSupabaseClient();const {data:{user},error}=await db.auth.getUser();if(error||user?.id!==userId||!user.email_confirmed_at)throw Error("Log masuk dengan e-mel yang telah disahkan.");return db}
export function InviteAdmin({institutionId,userId}:{institutionId:string;userId:string}){
 const [email,setEmail]=useState(""),[role,setRole]=useState("student"),[history,setHistory]=useState<History[]>([]),[issued,setIssued]=useState<Issued|null>(null);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[revision,setRevision]=useState(0),[revokeId,setRevokeId]=useState("");
 useEffect(()=>{let live=true;setLoading(true);setHistory([]);void (async()=>{try{const db=await verifiedUser(userId);const {data,error}=await db.rpc("tf_list_institution_invites",{p_institution:institutionId});if(error)throw Error("Sejarah jemputan tidak tersedia. Semak keahlian atau migrasi.");if(live)setHistory((data||[]) as History[])}catch(e){if(live)setError(e instanceof Error?e.message:"Gagal memuatkan jemputan.")}finally{if(live)setLoading(false)}})();return()=>{live=false}},[institutionId,userId,revision]);
 async function issue(){if(busy||issued)return;setBusy(true);setError("");setNotice("");try{const db=await verifiedUser(userId);const {data,error}=await db.rpc("tf_issue_institution_invite",{p_institution:institutionId,p_email:email.trim(),p_role:role});const row=(data as Issued[]|null)?.[0];if(error||!row||! /^[a-f0-9]{64}$/.test(row.invite_token))throw Error("Jemputan tidak dapat dicipta. Semak e-mel, akses dan had penggunaan.");setIssued(row);setEmail("");setRevision(v=>v+1)}catch(e){setError(e instanceof Error?e.message:"Jemputan gagal.")}finally{setBusy(false)}}
 async function revoke(){if(busy||!revokeId)return;setBusy(true);setError("");setNotice("");try{const db=await verifiedUser(userId);const {data,error}=await db.rpc("tf_revoke_institution_invite",{p_institution:institutionId,p_invite:revokeId});if(error||data!==true)throw Error("Jemputan tidak dapat dibatalkan.");if(issued?.invite_id===revokeId)setIssued(null);setNotice("Jemputan dibatalkan.");setRevokeId("");setRevision(v=>v+1)}catch(e){setError(e instanceof Error?e.message:"Pembatalan gagal.")}finally{setBusy(false)}}
 return <section className="tf-career-tile tf-section" aria-labelledby="tf-invite-admin" style={{marginTop:18}}>
  <h2 id="tf-invite-admin"><Mail size={20}/> Jemput ahli institusi</h2><p>Jemput pelajar atau pensyarah menggunakan e-mel akaun yang disahkan. Kongsi token secara peribadi kepada penerima yang dimaksudkan; aplikasi tidak menghantar e-mel secara automatik.</p>
  <form className="tf-form" onSubmit={e=>{e.preventDefault();void issue()}}><fieldset className="tf-coach-fields" disabled={busy||loading||!!issued}>
   <label htmlFor="tf-invite-email">E-mel penerima</label><input id="tf-invite-email" type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/>
   <label htmlFor="tf-invite-role">Peranan jemputan</label><select id="tf-invite-role" value={role} onChange={e=>setRole(e.target.value)}><option value="student">Pelajar</option><option value="lecturer">Pensyarah</option></select>
   <button type="submit" className="tf-btn" disabled={!email.trim()}>Cipta jemputan</button>
  </fieldset></form>
  {issued&&<div className="tf-career-result"><strong>Token dipaparkan sekali sahaja</strong><p>Sah sehingga {date(issued.valid_until)}. Salin sebelum menutup paparan.</p><label htmlFor="tf-issued-token">Token jemputan baharu</label><textarea id="tf-issued-token" readOnly rows={3} value={issued.invite_token}/><div className="tf-career-actions"><button type="button" className="tf-career-secondary" onClick={()=>void navigator.clipboard.writeText(issued.invite_token).then(()=>setNotice("Token disalin. Kongsi secara peribadi.")).catch(()=>setNotice("Salin token secara manual."))}><Copy size={14}/> Salin token</button><button type="button" className="tf-career-secondary" onClick={()=>{setIssued(null);setNotice("Token disembunyikan dan tidak boleh dipulihkan.")}}>Tutup token</button></div></div>}
  <h3>Sejarah jemputan (100 terkini)</h3>{loading?<p role="status">Memuatkan sejarah...</p>:history.length?history.map(row=><div className="tf-career-milestone" key={row.invite_id}><p><b>{row.recipient_email}</b> · {roleName(row.invite_role)}</p><small>{statusName[row.invite_status]||"Tidak diketahui"} · {date(row.valid_until)}</small>{row.invite_status==="pending"&&<div className="tf-career-actions">{revokeId===row.invite_id?<><button type="button" className="tf-career-secondary" disabled={busy} onClick={()=>void revoke()}>Sahkan pembatalan</button><button type="button" className="tf-career-secondary" disabled={busy} onClick={()=>setRevokeId("")}>Kembali</button></>:<button type="button" className="tf-career-secondary" disabled={busy} onClick={()=>setRevokeId(row.invite_id)}>Batalkan jemputan</button>}</div>}</div>):<p>Tiada sejarah jemputan.</p>}
  <button type="button" className="tf-career-secondary" disabled={busy||loading} onClick={()=>{setError("");setRevision(v=>v+1)}}>Muat semula jemputan</button>
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="tf-career-error">{error}</p>}
 </section>
}
export function InviteRecipient({userId,onJoined}:{userId:string;onJoined:()=>void}){
 const [token,setToken]=useState(""),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function check(accept:boolean){if(busy||! /^[a-f0-9]{64}$/.test(token.trim())||(accept&&!preview))return;setBusy(true);setError("");setNotice("");try{
  const db=await verifiedUser(userId);
  if(accept){const {data,error}=await db.rpc("tf_accept_institution_invite",{p_token:token.trim()});if(error||typeof data!=="string")throw Error("Jemputan tidak tersedia. Semak e-mel, tempoh atau hubungi admin.");setToken("");setPreview(null);setNotice("Keahlian institusi berjaya diaktifkan.");onJoined()}
  else{setPreview(null);const {data,error}=await db.rpc("tf_preview_institution_invite",{p_token:token.trim()});const row=(data as Preview[]|null)?.[0];if(error||!row)throw Error("Jemputan tidak tersedia. Semak e-mel, tempoh atau hubungi admin.");setPreview(row)}
 }catch(e){setError(e instanceof Error?e.message:"Jemputan gagal.");setPreview(null)}finally{setBusy(false)}}
 return <section className="tf-career-tile tf-section" aria-labelledby="tf-invite-recipient" style={{marginTop:18}}>
  <h2 id="tf-invite-recipient"><ShieldCheck size={20}/> Sertai institusi</h2><p>Tampal token yang diterima daripada admin. Semak institusi dan peranan sebelum mengesahkan penyertaan. Token tidak dimasukkan ke URL atau storan browser.</p>
  <form className="tf-form" onSubmit={e=>{e.preventDefault();void check(false)}}><label htmlFor="tf-invite-token">Token jemputan diterima</label><textarea id="tf-invite-token" rows={3} maxLength={64} autoComplete="off" spellCheck={false} disabled={busy} value={token} onChange={e=>{setToken(e.target.value);setPreview(null);setError("");setNotice("")}}/><button className="tf-btn" type="submit" disabled={busy||! /^[a-f0-9]{64}$/.test(token.trim())}>Semak jemputan</button></form>
  {preview&&<div className="tf-career-result"><h3>Semak penyertaan</h3><p><b>{preview.institution_name}</b> · {roleName(preview.invite_role)}</p><p>Sah sehingga {date(preview.valid_until)}. Keahlian tidak memberikan akses automatik kepada portfolio peribadi anda.</p><div className="tf-career-actions"><button type="button" className="tf-btn" disabled={busy} onClick={()=>void check(true)}>Terima jemputan</button><button type="button" className="tf-career-secondary" disabled={busy} onClick={()=>{setPreview(null);setToken("")}}>Batal</button></div></div>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="tf-career-error">{error}</p>}
 </section>
}
