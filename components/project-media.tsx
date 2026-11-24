"use client";
import {ArrowUpRight,ExternalLink,Globe2,Image as ImageIcon,LayoutTemplate,Monitor} from "lucide-react";
import {ProjectGallery,type PublishedImage} from "@/components/project-gallery-public";

export type ProjectMediaData={
 title:string;description:string;url?:string|null;images?:PublishedImage[];
};
function siteLink(raw?:string|null){
 if(!raw)return null;
 try{
  const u=new URL(raw);
  if(!["http:","https:"].includes(u.protocol))return null;
  return {href:u.toString(),domain:u.hostname.replace(/^www\./,"")};
 }catch{return null;}
}
export default function ProjectMedia({project}:{project:ProjectMediaData}){
 const site=siteLink(project.url);
 const images=Array.isArray(project.images)?project.images:[];
 if(images.length){
  return <div className="tf-project-media tf-project-media-images">
   <ProjectGallery project={{...project,images}}/>
   {site&&<a className="tf-media-visit" href={site.href} target="_blank" rel="noopener noreferrer" title={`Buka ${site.domain}`}><ExternalLink size={14}/> Lihat website</a>}
  </div>;
 }
 if(site){
  return <div className="tf-project-media tf-project-media-poster">
   <div className="tf-media-glow" aria-hidden="true"/>
   <div className="tf-media-browser" aria-hidden="true">
    <div className="tf-media-browser-bar">
     <span className="tf-media-browser-dots"><i/><i/><i/></span>
     <span className="tf-media-browser-address"><Globe2 size={11}/>{site.domain}</span>
     <LayoutTemplate size={12}/>
    </div>
    <div className="tf-media-browser-body">
     <div className="tf-media-browser-sidebar"><span/><span/><span/><span/></div>
     <div className="tf-media-browser-content">
      <span className="tf-media-browser-pill"/>
      <div className="tf-media-browser-heading">{project.title}</div>
      <span className="tf-media-browser-rule"/>
      <span className="tf-media-browser-rule short"/>
      <div className="tf-media-browser-tiles"><i/><i/><i/></div>
     </div>
    </div>
   </div>
   <div className="tf-media-poster-footer">
    <div><span className="tf-media-type"><Monitor size={13}/> WEBSITE PROJECT</span><strong>{site.domain}</strong></div>
    <a href={site.href} className="tf-project-media-open" target="_blank" rel="noopener noreferrer" aria-label={`Buka website ${project.title}`}>Buka laman <ArrowUpRight size={15}/></a>
   </div>
  </div>;
 }
 return <div className="tf-project-media tf-project-media-placeholder">
  <div className="tf-media-placeholder-icon"><ImageIcon size={30}/></div>
  <strong>{project.title}</strong>
  <span>Tambah gambar projek atau URL website untuk paparan di sini.</span>
 </div>;
}
