"use client";
import {ExternalLink,Globe2,Image as ImageIcon} from "lucide-react";
import {ProjectGallery,type PublishedImage} from "@/components/project-gallery-public";
export type ProjectMediaData={title:string;description:string;url?:string|null;images?:PublishedImage[]};
function safeUrl(s?:string|null){if(!s)return null;try{const u=new URL(s);return ["http:","https:"].includes(u.protocol)?u.toString():null}catch{return null}}
export default function ProjectMedia({project,mode="thumbnail"}:{project:ProjectMediaData;mode?:"thumbnail"|"full"}){
 const site=safeUrl(project.url);const hasImages=!!project.images?.length;
 if(hasImages)return <div className="tf-project-media tf-project-media-images"><ProjectGallery project={project}/>{site&&<a className="tf-media-visit" href={site} target="_blank" rel="noopener noreferrer"><ExternalLink size={13}/> Visit website</a>}</div>;
 if(site)return <div className="tf-project-media tf-project-media-site"><iframe title={`Pratonton website ${project.title}`} src={site} loading="lazy" sandbox="allow-forms allow-scripts allow-popups" referrerPolicy="no-referrer" tabIndex={-1}/><div className="tf-project-media-label"><Globe2 size={14}/> LIVE WEBSITE PREVIEW</div><a href={site} className="tf-project-media-open" target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Buka Website</a><span className="tf-media-fallback">Jika preview tidak muncul, gunakan Buka Website. Sesetengah laman menyekat iframe.</span></div>;
 return <div className="tf-project-media tf-project-media-empty"><ImageIcon size={34}/><span>Belum ada gambar atau pautan website</span></div>;
}
