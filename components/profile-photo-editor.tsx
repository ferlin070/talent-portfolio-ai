"use client";
import { useEffect,useMemo,useRef,useState } from "react";
import { Camera,CheckCircle2,Trash2,UploadCloud,UserRound } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

const bucket="profile-photos";
const MAX=2*1024*1024;
export default function ProfilePhotoEditor({userId,url,onChange}:{userId:string;url:string;onChange:(url:string)=>void}){
 const client=useMemo(()=>getSupabaseClient(),[]);
 const input=useRef<HTMLInputElement>(null);
 const [preview,setPreview]=useState(""),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{if(!file){setPreview("");return;}const objectUrl=URL.createObjectURL(file);setPreview(objectUrl);return()=>URL.revokeObjectURL(objectUrl)},[file]);
 const trustedPrefix=`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${userId}/`;
 function oldPath(){if(!url.startsWith(trustedPrefix))return null;return decodeURIComponent(url.slice(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/`.length));}
 async function upload(){
  if(!file)return;
  setBusy(true);setMessage("");
  try{
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path=`${userId}/${crypto.randomUUID()}.${ext}`;
   const {error:uploadError}=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   const newUrl=client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
   const {error:saveError}=await client.from("profiles").upsert({user_id:userId,avatar_url:newUrl,updated_at:new Date().toISOString()},{onConflict:"user_id"});
   if(saveError){await client.storage.from(bucket).remove([path]);throw saveError;}
   const previous=oldPath();
   if(previous&&previous!==path)await client.storage.from(bucket).remove([previous]);
   onChange(newUrl);setFile(null);if(input.current)input.current.value="";
   setMessage("Gambar profil berjaya dikemas kini.");
  }catch(e){setMessage(e instanceof Error?e.message:"Upload gagal.")}
  finally{setBusy(false)}
 }
 async function remove(){
  if(!url)return;
  if(!confirm("Buang gambar profil anda?"))return;
  setBusy(true);setMessage("");
  try{
   const previous=oldPath();
   const {error}=await client.from("profiles").update({avatar_url:"",updated_at:new Date().toISOString()}).eq("user_id",userId);
   if(error)throw error;
   if(previous){const {error:storageError}=await client.storage.from(bucket).remove([previous]);if(storageError)setMessage("Profil dikemas kini; fail lama mungkin masih tersedia: "+storageError.message);}
   onChange("");setFile(null);if(input.current)input.current.value="";
   if(!previous)setMessage("Gambar profil telah dibuang.");
  }catch(e){setMessage(e instanceof Error?e.message:"Tidak dapat membuang gambar.")}
  finally{setBusy(false)}
 }
 function selectFile(value:File|null){
  setMessage("");
  if(!value){setFile(null);return;}
  if(!["image/png","image/jpeg","image/webp"].includes(value.type)){setMessage("Pilih imej JPG, PNG atau WebP sahaja.");return;}
  if(value.size>MAX){setMessage("Gambar mesti kurang daripada 2 MB.");return;}
  setFile(value);
 }
 return <section className="tf-card tf-photo-editor">
  <div className="tf-card-head"><div><h3>Profile Photo</h3><p>Gambar profesional yang dipaparkan pada portfolio anda</p></div><span className="tf-pill"><Camera size={13}/> Avatar</span></div>
  <div className="tf-photo-editor-main"><div className="tf-photo-avatar">
  {(preview||url)?<img src={preview||url} alt="Pratonton gambar profil" referrerPolicy="no-referrer"/>:<UserRound size={51}/>}
  <button type="button" disabled={busy} onClick={()=>input.current?.click()} aria-label="Pilih gambar profil"><Camera size={16}/></button></div>
  <div className="tf-photo-action"><h4>Make a great first impression.</h4><p>Upload gambar muka yang jelas. JPG, PNG atau WebP, maksimum 2 MB.</p>
  <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>selectFile(e.target.files?.[0]||null)} className="tf-visually-hidden"/>
  <div className="tf-form-actions"><button className="tf-btn tf-btn-outline" disabled={busy} type="button" onClick={()=>input.current?.click()}><UploadCloud size={16}/> Pilih Gambar</button>
  {file&&<button className="tf-btn" disabled={busy} onClick={()=>void upload()}><CheckCircle2 size={16}/> Simpan Gambar</button>}
  {url&&<button className="tf-btn tf-btn-outline" disabled={busy} onClick={()=>void remove()}><Trash2 size={15}/> Buang</button>}</div>
  </div></div><p className="tf-photo-privacy">Perhatian: gambar disimpan dalam storan awam untuk paparan portfolio. Jangan muat naik gambar sensitif. Penerbitan portfolio tetap dikawal secara berasingan.</p>
  {message&&<p className="tf-hint" role="status">{message}</p>}
 </section>
}
