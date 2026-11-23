import Link from "next/link";
export default function Home() { return <><span className="eyebrow">Portfolio • Evidence • Career Growth</span>
<section className="hero"><span className="pill">MVP Preview</span>
<h1 className="heading" style={{fontSize:"clamp(38px,5vw,64px)"}}>Bina masa depan melalui portfolio digital.</h1>
<p className="lead">Satu ruang untuk pelajar dan pekerja mengurus profil, projek, sijil dan perkembangan kemahiran.</p>
<Link href="/dashboard" className="button" style={{background:"white",color:"#23458e"}}>Terokai dashboard →</Link></section>
<div className="grid">{[["Smart Profile","Profil pendidikan, pengalaman dan kemahiran di satu tempat."],["Certificate Vault","Rekod sijil dan bukti kelayakan secara tersusun."],["Skills Intelligence","Banding kemahiran dengan sasaran kerjaya."]].map(([title,desc])=><article className="panel" key={title}><h3>{title}</h3><p className="muted">{desc}</p></article>)}</div></>; }