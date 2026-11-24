import {Handshake,ShieldCheck} from "lucide-react";
type Variant="landing"|"footer"|"dashboard"|"report";
export const SUPPORT_ACKNOWLEDGEMENT="Talentfolio AI dibangunkan dengan sokongan TVETMARA Besut di bawah program DFK Incubator.";
export const SUPPORT_LABEL="Sokongan pembangunan projek";
export function SupportLogos({compact=false}:{compact?:boolean}){
 return <div className={`tf-support-logos ${compact?"tf-support-logos-compact":""}`} aria-label="Logo TVETMARA Besut dan DFK Incubator">
  <div className="tf-support-logo tf-support-logo-tvet"><img src="/partners/tvetmara-besut.svg" alt="TVETMARA Besut" width={260} height={60} loading="lazy"/></div>
  <span className="tf-support-logo-divider" aria-hidden="true"/>
  <div className="tf-support-logo tf-support-logo-dfk"><img src="/partners/dfk-incubator.svg" alt="DFK Incubator" width={170} height={100} loading="lazy"/></div>
 </div>;
}
export default function SupportPartners({variant="landing"}:{variant?:Variant}){
 if(variant==="landing")return <section className="tf-support-banner" id="sokongan" aria-labelledby="tf-support-title">
  <div className="tf-support-copy"><span className="tf-support-eyebrow"><Handshake size={16}/> PROGRAM SOKONGAN PROJEK</span><h2 id="tf-support-title">Dibangunkan dengan sokongan ekosistem TVET</h2><p>{SUPPORT_ACKNOWLEDGEMENT}</p></div>
  <SupportLogos/>
 </section>;
 if(variant==="footer")return <div className="tf-support-footer-logos">
  <span>DISOKONG OLEH</span><SupportLogos compact/><small>{SUPPORT_ACKNOWLEDGEMENT}</small>
 </div>;
 if(variant==="dashboard")return <div className="tf-support-dashboard">
  <div className="tf-support-dashboard-title"><ShieldCheck size={15}/> DIBANGUNKAN DENGAN SOKONGAN</div>
  <SupportLogos compact/><p>TVETMARA Besut · DFK Incubator</p>
 </div>;
 return <aside className="tf-report-support" aria-label="Penghargaan sokongan projek">
  <div className="tf-report-support-label"><Handshake size={17}/> PENGHARGAAN SOKONGAN PROJEK</div>
  <SupportLogos compact/><p>{SUPPORT_ACKNOWLEDGEMENT}</p>
 </aside>;
}
