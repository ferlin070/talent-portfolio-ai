"use client";

import {useEffect,useId,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {ChevronLeft,ChevronRight,Expand,Images,X} from "lucide-react";

export type PublishedImage={url:string;caption:string;is_cover?:boolean};
export type PublishedProject={title:string;description:string;url?:string|null;images?:PublishedImage[]};

export function ProjectGallery({
 project,variant="cover"
}:{project:PublishedProject;variant?:"cover"|"grid"}){
 const items=(project.images||[])
  .filter(image=>typeof image.url==="string"&&image.url.startsWith("https://"));
 const [active,setActive]=useState<number|null>(null);
 const dialogRef=useRef<HTMLDivElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 const titleId=useId();

 useEffect(()=>{
  if(active===null)return;
  const previous=document.activeElement instanceof HTMLElement
   ?document.activeElement:null;
  const priorOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeRef.current?.focus();

  function keydown(event:KeyboardEvent){
   if(event.key==="Escape"){event.preventDefault();setActive(null);return;}
   if(event.key==="ArrowRight"&&items.length>1){
    event.preventDefault();
    setActive(current=>current===null?null:(current+1)%items.length);
   }
   if(event.key==="ArrowLeft"&&items.length>1){
    event.preventDefault();
    setActive(current=>current===null?null:(current+items.length-1)%items.length);
   }
   if(event.key==="Tab"&&dialogRef.current){
    const focusables=Array.from(
     dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
    );
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(event.shiftKey&&document.activeElement===first){
     event.preventDefault();last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
     event.preventDefault();first.focus();
    }
   }
  }
  document.addEventListener("keydown",keydown);

  return ()=>{
   document.removeEventListener("keydown",keydown);
   document.body.style.overflow=priorOverflow;
   previous?.focus();
  };
 },[active,items.length]);

 if(!items.length)return null;

 const coverIndex=Math.max(0,items.findIndex(image=>image.is_cover));
 function photo(image:PublishedImage,index:number){
  return <button type="button" className="pg-photo-button" key={index}
   onClick={()=>setActive(index)}
   aria-label={`Buka foto ${index+1} daripada ${items.length}: ${image.caption||project.title}`}>
   <img src={image.url} alt={image.caption||`Foto hasil kerja: ${project.title}`}
    loading="lazy" decoding="async"/>
   <span className="pg-photo-overlay"><Expand size={16}/> Lihat gambar</span>
  </button>;
 }

 return <>
  <div className={variant==="grid"?"pg-public-grid":"pg-public-cover"}>
   {variant==="grid"?items.slice(0,6).map(photo):photo(items[coverIndex],coverIndex)}
   {variant==="cover"&&items.length>1&&<span className="pg-count">
    <Images size={13}/>{items.length} foto
   </span>}
  </div>
  {active!==null&&typeof document!=="undefined"&&createPortal(
   <div ref={dialogRef} className="pg-lightbox" role="dialog" aria-modal="true"
    aria-labelledby={titleId} onClick={()=>setActive(null)}>
    <button type="button" ref={closeRef} className="pg-close" aria-label="Tutup galeri"
     onClick={()=>setActive(null)}><X size={25}/></button>
    <div className="pg-lightbox-content" onClick={event=>event.stopPropagation()}>
     <img src={items[active].url} alt={items[active].caption||project.title}
      decoding="async"/>
     <div className="pg-lightbox-caption">
      <strong id={titleId}>{project.title}</strong>
      <span>{items[active].caption}</span>
      <small aria-live="polite">Gambar {active+1} daripada {items.length}</small>
     </div>
    </div>
    {items.length>1&&<>
     <button type="button" className="pg-lightbox-prev" aria-label="Foto sebelumnya"
      onClick={event=>{event.stopPropagation();setActive((active+items.length-1)%items.length)}}>
      <ChevronLeft size={30}/>
     </button>
     <button type="button" className="pg-lightbox-next" aria-label="Foto seterusnya"
      onClick={event=>{event.stopPropagation();setActive((active+1)%items.length)}}>
      <ChevronRight size={30}/>
     </button>
    </>}
   </div>,
   document.body
  )}
 </>;
}
