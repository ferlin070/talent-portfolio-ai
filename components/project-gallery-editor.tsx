"use client";
import {useCallback,useEffect,useMemo,useState,useRef,type ChangeEvent} from "react";
import {ArrowDown,ArrowUp,Camera,Check,ImagePlus,Images,Save,Star,Trash2,UploadCloud} from "lucide-react";
import {getSupabaseClient} from "@/lib/supabase";

export type GalleryImage={id:string;project_id:string;user_id:string;storage_path:string;caption:string;sort_order:number;is_cover:boolean;created_at:string};
export type GalleryProject={id:string;title:string;description:string;url:string|null;is_public:boolean};
const BUCKET="project-gallery",MAX_BYTES=5*1024*1024,MAX_PER_PROJECT=12;
const ext=(f:File)=>f.type==="image/png"?"png":f.type==="image/webp"?"webp":"jpg";
const valid=(f:File)=>["image/jpeg","image/png","image/webp"].includes(f.type)&&f.size<=MAX_BYTES;
const msg=(e:unknown)=>e instanceof Error?e.message:"Operasi gagal.";
export default function ProjectGalleryEditor({userId,projects,onChanged}:{userId:string;projects:GalleryProject[];onChanged:()=>Promise<void>}){
 const supabase=useMemo(()=>getSupabaseClient(),[]);
 const [selected,setSelected]=useState("");
 const [images,setImages]=useState<GalleryImage[]>([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[notice,setNotice]=useState("");
 const fileInput=useRef<HTMLInputElement>(null);
 const [previews,setPreviews]=useState<string[]>([]);
 const [files,setFiles]=useState<File[]>([]),[dragActive,setDragActive]=useState(false),[draft,setDraft]=useState({title:"",description:"",url:"",is_public:false});
 const [captions,setCaptions]=useState<Record<string,string>>({});
 const project=projects.find(x=>x.id===selected)||null;
 useEffect(()=>{const urls=files.map(file=>URL.createObjectURL(file));setPreviews(urls);return()=>urls.forEach(URL.revokeObjectURL);},[files]);
 useEffect(()=>{if(!selected||!projects.some(x=>x.id===selected))setSelected(projects[0]?.id||"");},[projects,selected]);
 useEffect(()=>{if(project)setDraft({title:project.title,description:project.description,url:project.url||"",is_public:project.is_public});},[project]);
 const load=useCallback(async(projectId:string)=>{
  if(!projectId){setImages([]);return;}
  setLoading(true);
  const {data,error}=await supabase.from("project_images").select("id,project_id,user_id,storage_path,caption,sort_order,is_cover,created_at").eq("user_id",userId).eq("project_id",projectId).order("sort_order",{ascending:true}).order("created_at",{ascending:true});
  setLoading(false);
  if(error){setNotice(error.message);return;}
  const rows=(data||[]) as GalleryImage[];
  setImages(rows);setCaptions(Object.fromEntries(rows.map(x=>[x.id,x.caption])));
 },[supabase,userId]);
 useEffect(()=>{void load(selected);},[load,selected]);
 async function act(fn:()=>Promise<void>){setBusy(true);setNotice("");try{await fn();await onChanged();await load(selected);}catch(e){setNotice(msg(e))}finally{setBusy(false)}}
 function checkFiles(added:File[]){setFiles(added);const bad=added.filter(x=>!valid(x));setNotice(bad.length?"Hanya JPG, PNG atau WebP maksimum 5 MB setiap gambar dibenarkan.":"");}
 function choose(e:ChangeEvent<HTMLInputElement>){checkFiles(Array.from(e.target.files||[]));}
 async function upload(){if(!project||!files.length)return;await act(async()=>{
  const good=files.filter(valid);if(good.length!==files.length)throw new Error("Semak jenis dan saiz gambar.");
  if(images.length+good.length>MAX_PER_PROJECT)throw new Error(`Maksimum ${MAX_PER_PROJECT} gambar bagi setiap projek.`);
  for(let i=0;i<good.length;i++){
   const file=good[i],path=`${userId}/${project.id}/${crypto.randomUUID()}.${ext(file)}`;
   const {error:uploadError}=await supabase.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   const {error:dbError}=await supabase.from("project_images").insert({user_id:userId,project_id:project.id,storage_path:path,caption:"",sort_order:images.length+i,is_cover:images.length===0&&i===0});
   if(dbError){await supabase.storage.from(BUCKET).remove([path]);throw dbError;}
  }
  setFiles([]);const inp=document.getElementById("project-gallery-upload") as HTMLInputElement|null;if(inp)inp.value="";
  setNotice("Gambar berjaya dimuat naik. Tekan Publish semula untuk kemas kini portfolio awam.");
 });}
 async function saveDetails(){if(!project)return;await act(async()=>{if(!draft.title.trim())throw Error("Nama projek wajib diisi.");const url=draft.url.trim();if(url){const u=new URL(url);if(!["https:","http:"].includes(u.protocol))throw Error("URL mesti menggunakan https/http.");}
  const {error}=await supabase.from("projects").update({title:draft.title.trim(),description:draft.description.trim(),url:url||null,is_public:draft.is_public}).eq("id",selected).eq("user_id",userId);if(error)throw error;setNotice("Penerangan projek dikemas kini. Publish semula untuk paparkan perubahan.");
 });}
 async function saveCaption(im:GalleryImage){await act(async()=>{const {error}=await supabase.from("project_images").update({caption:(captions[im.id]||"").trim()}).eq("id",im.id).eq("user_id",userId);if(error)throw error;setNotice("Kapsyen gambar disimpan.");});}
 async function cover(im:GalleryImage){await act(async()=>{const {error:e1}=await supabase.from("project_images").update({is_cover:false}).eq("project_id",selected).eq("user_id",userId);if(e1)throw e1;const {error:e2}=await supabase.from("project_images").update({is_cover:true}).eq("id",im.id).eq("user_id",userId);if(e2)throw e2;setNotice("Gambar utama ditetapkan.");});}
 async function move(im:GalleryImage,step:number){const i=images.findIndex(x=>x.id===im.id),other=images[i+step];if(!other)return;await act(async()=>{const {error:e1}=await supabase.from("project_images").update({sort_order:other.sort_order}).eq("id",im.id).eq("user_id",userId);if(e1)throw e1;const {error:e2}=await supabase.from("project_images").update({sort_order:im.sort_order}).eq("id",other.id).eq("user_id",userId);if(e2)throw e2;});}
 async function remove(im:GalleryImage){if(!confirm("Padam gambar dan kapsyen ini?"))return;await act(async()=>{const {error:e}=await supabase.from("project_images").delete().eq("id",im.id).eq("user_id",userId);if(e)throw e;const {error:se}=await supabase.storage.from(BUCKET).remove([im.storage_path]);if(se)throw new Error("Metadata dipadam, tetapi fail gagal dipadam: "+se.message);setNotice("Gambar dipadam.");});}
 if(!projects.length)return null;
 return <section className="tf-card tf-section tf-gallery-editor">
   <div className="tf-card-head"><div><h3>Work Photo Gallery</h3><p>Muat naik hasil kerja, susun gambar dan ceritakan proses projek anda.</p></div><span className="tf-pill"><Images size={14}/> {images.length}/{MAX_PER_PROJECT} images</span></div>
   <div className="tf-gallery-projects">{projects.map(p=><button key={p.id} type="button" className={p.id===selected?"active":""} onClick={()=>{setSelected(p.id);setFiles([]);setNotice("");}}>{p.title}</button>)}</div>
   {project&&<><div className="tf-gallery-layout"><div className="tf-gallery-fields">
   <h4>Maklumat projek</h4><label>Tajuk kerja<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} maxLength={120}/></label>
   <label>Penerangan / proses kerja<textarea rows={5} maxLength={2000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Objektif, cabaran, proses, teknologi dan hasil kerja..."/></label>
   <label>URL projek (pilihan)<input type="url" value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})} placeholder="https://..."/></label>
   <label className="tf-checkbox"><input type="checkbox" checked={draft.is_public} onChange={e=>setDraft({...draft,is_public:e.target.checked})}/> Benarkan projek dan gambar dipaparkan selepas Publish</label>
   <button type="button" disabled={busy} className="tf-btn" onClick={()=>void saveDetails()}><Save size={15}/> Simpan Penerangan</button>
   </div><div className="tf-gallery-upload">
   <div className="tf-gallery-upload-icon"><ImagePlus size={28}/></div><h4>Tambah gambar hasil kerja</h4><p>Upload beberapa gambar sekali gus · JPG/PNG/WebP · Maksimum 5 MB setiap gambar · Sehingga {MAX_PER_PROJECT} gambar.</p>
   <div className={`tf-file-dropzone ${dragActive?"drag-active":""}`} onDragOver={e=>{e.preventDefault();setDragActive(true)}} onDragLeave={e=>{e.preventDefault();setDragActive(false)}} onDrop={e=>{e.preventDefault();setDragActive(false);if(!busy)checkFiles(Array.from(e.dataTransfer.files))}}><input ref={fileInput} id="project-gallery-upload" aria-label="Pilih gambar hasil kerja" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={busy} hidden/><button type="button" className="tf-file-select" disabled={busy} onClick={()=>fileInput.current?.click()}><ImagePlus size={17}/> Pilih Gambar Kerja</button><span>atau seret gambar ke kawasan ini</span></div>
   {!!files.length&&<div className="tf-gallery-selection"><b>{files.length} gambar dipilih</b><div className="tf-file-preview-list">{previews.map((src,i)=><div key={src}><img src={src} alt={files[i]?.name||"Pratonton gambar"}/><small>{files[i]?.name}</small></div>)}</div><div className="tf-file-name-list">{files.map((x,i)=><span key={i}>{x.name} · {(x.size/1024/1024).toFixed(1)} MB</span>)}</div></div>}
   <button type="button" disabled={busy||!files.length} className="tf-btn" onClick={()=>void upload()}><UploadCloud size={15}/>{busy?"Uploading...":"Upload Gambar"}</button>
   </div></div>
   <div className="tf-gallery-privacy"><Camera size={17}/><div><strong>Penting tentang privasi gambar:</strong> fail galeri disimpan dalam storan awam mengikut URL, walaupun projek belum diterbitkan. Hanya tajuk, gambar dan penerangan projek yang anda pilih akan dipaparkan dalam portfolio. Jangan muat naik gambar sulit. Selepas membuat perubahan, tekan <strong>Publish Portfolio</strong> semula.</div></div>
   {notice&&<p role="status" className="tf-gallery-message">{notice}</p>}
   {loading?<p>Memuatkan galeri...</p>:images.length===0?<div className="tf-gallery-empty"><Images size={29}/><b>Tiada gambar lagi</b><span>Tambah gambar kerja pertama untuk projek ini.</span></div>:
   <div className="tf-gallery-items">{images.map((im,i)=>{const src=supabase.storage.from(BUCKET).getPublicUrl(im.storage_path).data.publicUrl;return <article key={im.id} className="tf-gallery-item"><div className="tf-gallery-item-photo"><img alt={im.caption||`Gambar ${i+1} projek ${project.title}`} src={src} loading="lazy"/>{im.is_cover&&<span className="tf-gallery-cover"><Star size={13}/> Cover</span>}</div><div className="tf-gallery-item-body"><label>Kapsyen gambar<textarea rows={2} maxLength={500} placeholder="Contoh: Reka bentuk dashboard selepas penambahbaikan..." value={captions[im.id]??im.caption} onChange={e=>setCaptions(prev=>({...prev,[im.id]:e.target.value}))}/></label><div className="tf-gallery-item-actions"><button type="button" title="Simpan kapsyen" disabled={busy} onClick={()=>void saveCaption(im)}><Check size={15}/> Save</button><button type="button" title="Jadikan gambar utama" disabled={busy||im.is_cover} onClick={()=>void cover(im)}><Star size={15}/></button><button type="button" title="Alih ke kiri" disabled={busy||i===0} onClick={()=>void move(im,-1)}><ArrowUp size={15}/></button><button type="button" title="Alih ke kanan" disabled={busy||i===images.length-1} onClick={()=>void move(im,1)}><ArrowDown size={15}/></button><button type="button" title="Padam gambar" disabled={busy} onClick={()=>void remove(im)}><Trash2 size={15}/></button></div></div></article>})}</div>}
   </>}
 </section>;
}
