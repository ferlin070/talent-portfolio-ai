import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type {PublishedImage} from "@/components/project-gallery-public";
import PublicPortfolioClassic from "@/components/public-portfolio-classic";
import type { Metadata } from "next";
import PortfolioThemes, {type NewTheme} from "@/components/portfolio-themes";
import ExpansionThemes,{type ExpansionTheme} from "@/components/portfolio-expansion";
export const revalidate=300; // ISR fallback: authenticated publish route invalidates immediately.

type Snap={
 name?:string;headline?:string;bio?:string;location?:string;website?:string;avatar?:string;open_to_opportunities?:boolean;
 skills?:{name:string}[];
 projects?:{title:string;description:string;url:string;images?:PublishedImage[]}[];
 education?:{institution:string;qualification:string;field:string;start:number|null;end:number|null;description:string}[];
 experience?:{company:string;role:string;start:string|null;end:string|null;description:string}[];
};
type Portfolio={slug:string;template:string;snapshot:Snap;noindex:boolean;updated_at:string};
function validWebsite(raw:string){try{const u=new URL(raw);return ["https:","http:"].includes(u.protocol)?u.toString():null}catch{return null}}
function validAvatar(raw:string){
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL||"";
 if(!base)return null;
 try {const u=new URL(raw);const project=new URL(base);return u.origin===project.origin&&u.pathname.startsWith("/storage/v1/object/public/profile-photos/")?raw:null} catch{return null}
}
async function fetchPortfolio(slug:string):Promise<Portfolio>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length<3||slug.length>48)notFound();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error("Public portfolio database configuration is missing");
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc("get_published_portfolio_seo",{p_slug:slug});
 if(error){
  // Do not misreport a database/schema outage as an unpublished portfolio.
  console.error("[public-portfolio] lookup failed", {code:error.code});
  throw new Error("Public portfolio lookup temporarily unavailable");
 }
 if(!Array.isArray(data)||data.length>1){
  console.error("[public-portfolio] unexpected RPC response");
  throw new Error("Public portfolio lookup temporarily unavailable");
 }
 if(data.length===0)notFound();
 const published=data[0] as Portfolio;
 return {slug:published.slug,template:published.template,snapshot:published.snapshot||{},noindex:published.noindex===true,updated_at:published.updated_at};
}
const siteOrigin="https://talent-portfolio-ai.vercel.app";

export async function generateMetadata(
 {params}:{params:Promise<{slug:string}>}
):Promise<Metadata>{
 const {slug}=await params;
 const publication=await fetchPortfolio(slug);
 const snapshot=publication.snapshot;
 const name=snapshot.name?.trim()||"Portfolio Profesional";
 const headline=snapshot.headline?.trim()||"Portfolio";
 const description=(snapshot.bio?.trim()||`Profil profesional ${name}`).slice(0,155);
 const title=`${name} — ${headline} | Talentfolio AI`;
 const url=`${siteOrigin}/u/${publication.slug}`;

 return {
  title,
  description,
  alternates:{canonical:url},
  robots:publication.noindex
   ?{index:false,follow:false,nocache:true}
   :{index:true,follow:true},
  openGraph:{
   title,description,url,type:"profile",locale:"ms_MY",
   siteName:"Talentfolio AI",
   images:[{url:`${url}/opengraph-image`,width:1200,height:630,alt:title}]
  },
  twitter:{
   card:"summary_large_image",title,description,
   images:[`${url}/opengraph-image`]
  }
 };
}

export default async function PublicPortfolio({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const portfolio=await fetchPortfolio(slug);
 const s=portfolio.snapshot;
 const name=s.name?.trim()||"Professional Portfolio";
 const projects=Array.isArray(s.projects)?s.projects:[];
 const skills=Array.isArray(s.skills)?s.skills:[];
 const educations=Array.isArray(s.education)?s.education:[];
 const experiences=Array.isArray(s.experience)?s.experience:[];
 const avatar=s.avatar?validAvatar(s.avatar):null,website=s.website?validWebsite(s.website):null;
 const imageBase=(process.env.NEXT_PUBLIC_SUPABASE_URL||"")+"/storage/v1/object/public/project-gallery/";
 const safeProjects=projects.map(p=>({
  ...p,
  images:(Array.isArray(p.images)?p.images:[])
   .map(im=>{
     const prefix="/storage/v1/object/public/project-gallery/";
     const value=im.url.startsWith(prefix)
       ?`${process.env.NEXT_PUBLIC_SUPABASE_URL||""}${im.url}`
       :im.url;
     return {...im,url:value};
   })
   .filter(im=>{
     try{
       const imageUrl=new URL(im.url);
       return imageUrl.protocol==="https:"&&imageUrl.href.startsWith(imageBase);
     }catch{return false;}
   })
   .slice(0,12)
 }));
 if(["sunny","student3d","noirluxe"].includes(portfolio.template)){
  return <ExpansionThemes theme={portfolio.template as ExpansionTheme} name={name} headline={s.headline||""}
   bio={s.bio||""} location={s.location||""} avatar={avatar||""} website={website||""}
   skills={skills.map(x=>({name:x.name}))} openToOpportunities={s.open_to_opportunities===true}
   projects={safeProjects.map(x=>({title:x.title,description:x.description,url:x.url,images:x.images}))}
   education={educations.map(x=>({institution:x.institution,qualification:x.qualification,field:x.field,start:x.start,end:x.end,description:x.description}))}
   experience={experiences.map(x=>({company:x.company,role:x.role,start:x.start,end:x.end,description:x.description}))}/>;
 }
 if(["amber","neon","crimson"].includes(portfolio.template)){
   return <PortfolioThemes theme={portfolio.template as NewTheme}
    name={name} headline={s.headline||""} bio={s.bio||""} location={s.location||""}
    avatar={avatar||""} website={website||""}
    skills={skills.map(x=>({name:x.name}))} openToOpportunities={s.open_to_opportunities===true}
    projects={safeProjects.map(p=>({title:p.title,description:p.description,url:p.url,images:p.images}))}
    education={educations.map(x=>({institution:x.institution,qualification:x.qualification,field:x.field,start:x.start,end:x.end,description:x.description}))}
    experience={experiences.map(x=>({company:x.company,role:x.role,start:x.start,end:x.end,description:x.description}))}/>;
 }
 return <PublicPortfolioClassic
  template={portfolio.template}
  s={s}
  avatar={avatar||""}
  website={website||""}
  safeProjects={safeProjects}
 />;
}
