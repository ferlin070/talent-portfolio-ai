import {LayoutDashboard} from "lucide-react";

/**
 * Visual placeholders contain no personal data and do not announce fake values.
 * Only the containing status label is exposed to assistive technology.
 */
export default function WorkspaceSkeleton({compact=false}:{compact?:boolean}){
 return <div className={`tf-skeleton-page ${compact?"tf-skeleton-compact":""}`}
   role="status" aria-label="Memuatkan ruang kerja" aria-busy="true">
  <span className="tf-sr-only">Memuatkan data ruang kerja anda.</span>
  <div className="tf-skeleton-heading" aria-hidden="true">
   <span className="tf-skeleton-line tf-skeleton-kicker"/>
   <span className="tf-skeleton-line tf-skeleton-title"/>
   <span className="tf-skeleton-line tf-skeleton-subtitle"/>
  </div>
  <div className="tf-skeleton-hero" aria-hidden="true">
   <div>
    <span className="tf-skeleton-line tf-skeleton-kicker"/>
    <span className="tf-skeleton-line tf-skeleton-hero-title"/>
    <span className="tf-skeleton-line tf-skeleton-hero-subtitle"/>
   </div>
   <div className="tf-skeleton-illustration"><LayoutDashboard size={58} strokeWidth={1.1}/></div>
  </div>
  <div className="tf-skeleton-stats" aria-hidden="true">
   {[1,2,3,4].map(i=><div className="tf-skeleton-stat" key={i}>
     <span className="tf-skeleton-line tf-skeleton-stat-label"/>
     <span className="tf-skeleton-line tf-skeleton-stat-number"/>
   </div>)}
  </div>
  {!compact&&<div className="tf-skeleton-panels" aria-hidden="true">
   <div className="tf-skeleton-panel">
    <span className="tf-skeleton-line tf-skeleton-subtitle"/>
    <span className="tf-skeleton-line tf-skeleton-block"/>
    <span className="tf-skeleton-line tf-skeleton-block"/>
   </div>
   <div className="tf-skeleton-panel">
    <span className="tf-skeleton-line tf-skeleton-subtitle"/>
    <span className="tf-skeleton-line tf-skeleton-block"/>
    <span className="tf-skeleton-line tf-skeleton-block"/>
   </div>
  </div>}
 </div>;
}
