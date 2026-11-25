import {
  BriefcaseBusiness, CheckCircle2, ChevronRight, CircleUserRound,
  GraduationCap, Layers3, Sparkles, TrendingUp,
} from "lucide-react";

/** Illustrative product view, never presented as a real user's data. */
export default function MarketingPreview(){
 return <div className="tf-marketing-demo" aria-label="Contoh antaramuka Talentfolio AI">
  <div className="tf-marketing-demo-window">
   <div className="tf-marketing-demo-bar">
    <span className="tf-demo-dots" aria-hidden="true"><i/><i/><i/></span>
    <span>talentfolio.ai / contoh</span>
    <span className="tf-marketing-demo-pill">CONTOH PAPARAN</span>
   </div>
   <div className="tf-marketing-demo-body">
    <div className="tf-marketing-demo-nav" aria-hidden="true">
     <div className="tf-demo-avatar"><CircleUserRound size={21}/></div>
     <span className="is-selected"><Layers3 size={17}/></span>
     <span><BriefcaseBusiness size={17}/></span>
     <span><GraduationCap size={17}/></span>
     <span><TrendingUp size={17}/></span>
    </div>
    <div className="tf-marketing-demo-main">
     <div className="tf-marketing-demo-label"><Sparkles size={12}/> YOUR CAREER WORKSPACE</div>
     <h2>Selamat datang ke masa depan anda.</h2>
     <p>Profil · Portfolio · Kemahiran dalam satu ruang kerja.</p>
     <div className="tf-marketing-demo-metrics">
      <div><span>Profil digital</span><strong><CheckCircle2 size={18}/> Tersusun</strong></div>
      <div><span>Projek sebenar</span><strong><BriefcaseBusiness size={18}/> Dipamerkan</strong></div>
     </div>
     <div className="tf-marketing-demo-grid">
      <div className="tf-marketing-demo-chart">
       <div className="tf-marketing-demo-cardtitle">Perkembangan kemahiran <span>CONTOH</span></div>
       <div className="tf-demo-bar-row"><b>Frontend</b><span style={{"--fill":"81%"} as CSSProperties}/></div>
       <div className="tf-demo-bar-row"><b>Cloud</b><span style={{"--fill":"68%"} as CSSProperties}/></div>
       <div className="tf-demo-bar-row"><b>Database</b><span style={{"--fill":"55%"} as CSSProperties}/></div>
      </div>
      <div className="tf-marketing-demo-project">
       <div className="tf-demo-project-art"><Layers3 size={25}/></div>
       <span>PORTFOLIO</span>
       <b>Projek Pilihan</b>
       <small>Lihat hasil kerja <ChevronRight size={11}/></small>
      </div>
     </div>
    </div>
   </div>
  </div>
  <div className="tf-marketing-demo-float"><Sparkles size={17}/> Bina jenama profesional anda</div>
 </div>;
}
