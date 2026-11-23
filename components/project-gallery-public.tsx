"use client";
import {useEffect,useState} from "react";
import {ChevronLeft,ChevronRight,Expand,Images,X} from "lucide-react";
export type PublishedImage={url:string;caption:string;is_cover?:boolean};
export type PublishedProject={title:string;description:string;url?:string|null;images?:PublishedImage[]};
export function ProjectGallery({project,variant="cover"}:{project:PublishedProject;variant?:"cover"|"grid"}){
 const items=(project.images||[]).filter(x=>typeof x.url==="string"&&x.url.startsWith("https://"));
 const [active,setActive]=useState<number|null>(null);
 useEffect(()=>{if(active===null)return;function handle(e:KeyboardEvent){if(e.key==="Escape")setActive(null);if(e.key==="ArrowRight")setActive(i=>i===null?null:(i+1)%items.length);if(e.key==="ArrowLeft")setActive(i=>i===null?null:(i+items.length-1)%items.length);}window.addEventListener("keydown",handle);return()=>window.removeEventListener("keydown",handle)},[active,items.length]);
 if(!items.length)return null;
 const coverIndex=Math.max(0,items.findIndex(x=>x.is_cover));
 const photo=(x:PublishedImage,i:number)=> <button type="button" className="pg-photo-button" key={i} onClick={()=>setActive(i)} aria-label={`Lihat gambar ${i+1}: ${x.caption||project.title}`}><img src={x.url} alt={x.caption||`Foto hasil kerja: ${project.title}`} loading="lazy"/><span className="pg-photo-overlay"><Expand size={16}/> Lihat gambar</span></button>;
 return <><div className={variant==="grid"?"pg-public-grid":"pg-public-cover"}>{variant==="grid"?items.slice(0,6).map(photo):photo(items[coverIndex],coverIndex)}{variant==="cover"&&items.length>1&&<span className="pg-count"><Images size={13}/>{items.length} foto</span>}</div>
 {active!==null&&<div className="pg-lightbox" role="dialog" aria-modal="true" aria-label={`Galeri projek ${project.title}`} onClick={()=>setActive(null)}><button className="pg-close" aria-label="Tutup galeri" onClick={()=>setActive(null)}><X size={25}/></button><div className="pg-lightbox-content" onClick={e=>e.stopPropagation()}><img src={items[active].url} alt={items[active].caption||project.title}/><div className="pg-lightbox-caption"><strong>{project.title}</strong><span>{items[active].caption}</span><small>{active+1} / {items.length}</small></div></div>{items.length>1&&<><button className="pg-lightbox-prev" aria-label="Gambar sebelumnya" onClick={e=>{e.stopPropagation();setActive((active+items.length-1)%items.length)}}><ChevronLeft size={30}/></button><button className="pg-lightbox-next" aria-label="Gambar seterusnya" onClick={e=>{e.stopPropagation();setActive((active+1)%items.length)}}><ChevronRight size={30}/></button></>}</div>}</>;
}
