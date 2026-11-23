const certs = [["Cloud Computing Fundamentals","2026","Self-uploaded"],["Web Development Bootcamp","2025","Self-uploaded"],["Database Essentials","2025","Pending verification"]];
export default function Certificates() { return <><span className="eyebrow">Digital Evidence</span><h1 className="heading">Certificate Vault</h1>
<p className="lead">Rekod sijil, penerbit dan status pengesahan. Upload sebenar memerlukan Supabase Storage serta RLS.</p>
<div className="grid">{certs.map(([name,year,status])=><article className="panel" key={name}><span className="pill">{status}</span><h2 style={{fontSize:19,marginTop:20}}>{name}</h2><p className="muted">Tahun: {year}</p></article>)}</div>
<p className="muted">Nota: Sijil yang dimuat naik sendiri tidak semestinya disahkan.</p></>; }