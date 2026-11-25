# Talentfolio AI — Fasa 1: Kod Penuh (Bahagian B)

Branch: `security/phase1-hardening`. Setiap blok ialah kandungan fail penuh. Secret tidak disertakan.

## 13. middleware.ts

```ts
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const protectedPages = new Set([
  "dashboard",
  "profile",
  "projects",
  "education",
  "experience",
  "certificates",
  "skills",
  "portfolio",
  "resume",
  "settings",
  "prompt-generator",
]);

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function middleware(request: NextRequest) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!projectUrl || !publicKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const client = createServerClient(projectUrl, publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(values) {
        values.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser revalidates the session rather than trusting user cookie metadata.
  const {
    data: { user },
  } = await client.auth.getUser();

  const first = request.nextUrl.pathname.split("/")[1];
  const isProtected = protectedPages.has(first);
  const isAuth = request.nextUrl.pathname === "/auth";
  const isRecovery =
    request.nextUrl.searchParams.get("mode") === "recovery";

  if (isProtected && !user) {
    const url = new URL("/auth", request.url);
    url.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  if (isAuth && user && !isRecovery) {
    const destination = safeNext(request.nextUrl.searchParams.get("next"));
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/auth",
    "/dashboard/:path*",
    "/profile/:path*",
    "/projects/:path*",
    "/education/:path*",
    "/experience/:path*",
    "/certificates/:path*",
    "/skills/:path*",
    "/portfolio/:path*",
    "/resume/:path*",
    "/settings/:path*",
    "/prompt-generator/:path*",
  ],
};

```

## 14. app/auth/callback/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function destination(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const type = request.nextUrl.searchParams.get("type");
  const isRecovery = type === "recovery";
  const next = destination(request.nextUrl.searchParams.get("next"));

  if (code) {
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.exchangeCodeForSession(code);

    if (!error) {
      const target = isRecovery ? "/auth?mode=recovery" : next;
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/auth?error=email_confirmation_failed", request.url),
  );
}

```

## 15. app/auth/page.tsx

```tsx
"use client";
import Link from "next/link";
import SupportPartners from "@/components/support-partners";
import { useEffect,useMemo,useState,type FormEvent } from "react";
import { Award, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

type Mode="login"|"signup"|"reset"|"newpassword";
export default function AuthPage(){
 const client=useMemo(()=>getSupabaseClient(),[]);
 const [mode,setMode]=useState<Mode>("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 useEffect(()=>{
   const search=new URLSearchParams(window.location.search);
   const next=search.get("next");
   const destination=next?.startsWith("/")&&!next.startsWith("//")?next:"/dashboard";
   const recovery=search.get("mode")==="recovery"||window.location.hash.includes("type=recovery");
   if(recovery)setMode("newpassword");

   const {data:{subscription}}=client.auth.onAuthStateChange((event)=>{
     if(event==="PASSWORD_RECOVERY"){setMode("newpassword");return;}
     if(event==="SIGNED_IN"&&!recovery){
       window.location.replace(destination);
     }
   });

   return()=>subscription.unsubscribe();
 },[client]);
 const title={login:"Welcome back",signup:"Start your journey",reset:"Reset your password",newpassword:"Choose new password"}[mode];
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");setError("");
  try{
   if(mode==="signup"){
    if(password.length<10)throw new Error("Kata laluan mesti sekurang-kurangnya 10 aksara.");
    const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+"/auth/callback?next=/profile"}});
    if(error)throw error;
    if(data.session){window.location.assign("/profile");return}
    setMessage("Semak e-mel pengesahan anda. Sila klik pautan pengesahan sebelum log masuk.");
   }else if(mode==="login"){
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;
    window.location.assign("/dashboard");
   }else if(mode==="reset"){
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/auth/callback?type=recovery"});if(error)throw error;
    setMessage("Jika alamat ini berdaftar, pautan reset kata laluan akan dihantar.");
   }else{
    if(password.length<10)throw new Error("Kata laluan mesti sekurang-kurangnya 10 aksara.");
    const {error}=await client.auth.updateUser({password});if(error)throw error;
    setMessage("Kata laluan berjaya dikemas kini.");setMode("login");setPassword("");
   }
  }catch(e){setError(e instanceof Error?e.message:"Authentication failed");}
  finally{setBusy(false);}
 }
 return <main className="tf-auth-page"><div className="tf-auth-left"><Link href="/" className="tf-brand" style={{padding:0}}><span className="tf-brandicon tf-logo-mark"><img src="/talentfolio-mark.svg" alt="" width="38" height="38"/></span> Talentfolio AI</Link>
 <div><span className="tf-auth-badge"><Sparkles size={14}/> YOUR SKILLS DESERVE TO BE SEEN</span><h1>Your story.<br/>Your skills.<br/><em>Your future.</em></h1><p>One beautiful space to showcase your achievements and build a professional identity that keeps growing.</p><div className="tf-auth-points"><span><Award size={17}/> Professional Portfolio</span><span><ShieldCheck size={17}/> Private Certificate Vault</span><span><Sparkles size={17}/> Career Growth Insights</span></div></div><div className="tf-auth-bottom"><SupportPartners variant="auth"/><small>© {new Date().getFullYear()} Talentfolio AI · Privacy-first workspace</small></div></div>
 <div className="tf-auth-right"><div className="tf-auth-card"><div className="tf-auth-mobilebrand"><span className="tf-brandicon tf-logo-mark"><img src="/talentfolio-mark.svg" alt="" width="38" height="38"/></span> Talentfolio AI</div><div className="tf-eyebrow">PERSONAL WORKSPACE</div><h2>{title}</h2><p className="tf-auth-sub">{mode==="signup"?"Cipta akaun percuma untuk mula membina profil profesional.":mode==="login"?"Sign in to continue building your professional future.":mode==="reset"?"Kami akan hantarkan pautan set semula ke e-mel anda.":"Masukkan kata laluan baru untuk akaun anda."}</p>
 <form className="tf-form" onSubmit={submit}>
 {mode!=="newpassword"&&<label>E-mel address<div className="tf-auth-input"><Mail size={17}/><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></div></label>}
 {mode!=="reset"&&<label>Password<div className="tf-auth-input"><LockKeyhole size={17}/><input required minLength={mode==="login"?1:10} type={visible?"text":"password"} autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="login"?"Kata laluan akaun":"Minimum 10 aksara"}/><button type="button" aria-label={visible?"Sembunyikan kata laluan":"Tunjuk kata laluan"} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
 {mode==="login"&&<button className="tf-auth-forgot" type="button" onClick={()=>{setMode("reset");setError("");setMessage("")}}>Forgot password?</button>}
 <button className="tf-btn tf-auth-submit" disabled={busy} type="submit">{busy?"Processing...":mode==="signup"?"Create account":mode==="reset"?"Send reset link":mode==="newpassword"?"Update password":"Sign in"} <ArrowRight size={17}/></button>
 {message&&<p role="status" className="tf-auth-success"><CheckCircle2 size={16}/>{message}</p>}{error&&<p role="alert" className="tf-auth-error">{error}</p>}
 </form>
 <div className="tf-auth-switch">{mode==="login"?<>New to Talentfolio? <button onClick={()=>{setMode("signup");setError("");setMessage("")}}>Create an account</button></>:<>Already have an account? <button onClick={()=>{setMode("login");setError("");setMessage("")}}>Sign in</button></>}</div>
 <p className="tf-auth-privacy"><ShieldCheck size={15}/> Your data stays private until you choose to publish a portfolio.</p><SupportPartners variant="authMobile"/></div></div></main>;
}

```

## 16. app/api/account/export/route.ts

```ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateTables = [
  "profiles",
  "projects",
  "project_images",
  "certificates",
  "skills",
  "education",
  "work_experience",
  "portfolio_publications",
  "dashboard_preferences",
] as const;

export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";

  if (!header.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sila log masuk." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Sistem belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const token = header.slice(7);
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Sesi tidak sah." }, { status: 401 });
  }

  // All tables are queried with the user's JWT; RLS remains enforced.
  const rows: Record<string, unknown[]> = {};
  for (const table of privateTables) {
    const result = await client
      .from(table)
      .select("*")
      .eq("user_id", data.user.id);

    if (result.error) {
      return NextResponse.json(
        { error: `Gagal mengeksport ${table}.` },
        { status: 500 },
      );
    }

    rows[table] = result.data ?? [];
  }

  const payload = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      account: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
      data: rows,
      note:
        "Eksport JSON metadata akaun. Fail imej dan sijil tidak disertakan sebagai binari.",
    },
    null,
    2,
  );

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="talentfolio-data-export.json"',
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

```

## 17. app/api/account/delete/route.ts

```ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeletionInput = { confirmationEmail?: unknown };

function failure(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Collect files under the authenticated user's path before deleting any.
 * This handles nested gallery folders and storage pagination.
 */
async function removeUserFiles(
  bucket: string,
  userId: string,
  url: string,
  serviceKey: string,
) {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const paths: string[] = [];
  const visited = new Set<string>();

  async function collect(prefix: string, depth: number): Promise<void> {
    if (depth > 5 || visited.has(prefix)) {
      throw new Error("Struktur folder Storage tidak disokong.");
    }
    visited.add(prefix);

    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) throw new Error(`Gagal membaca Storage ${bucket}.`);
      const entries = data ?? [];

      for (const entry of entries) {
        const path = `${prefix}/${entry.name}`;
        if (!path.startsWith(`${userId}/`)) {
          throw new Error("Lokasi Storage tidak selamat.");
        }
        if (!entry.id) {
          await collect(path, depth + 1);
        } else {
          paths.push(path);
        }
      }

      if (entries.length < 100) break;
      offset += 100;
    }
  }

  await collect(userId, 0);

  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100);
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw new Error(`Gagal memadam Storage ${bucket}.`);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return failure("Asal permintaan tidak dibenarkan.", 403);
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return failure("Sila log masuk untuk memadam akaun.", 401);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return failure("Fungsi pemadaman akaun belum diaktifkan oleh pentadbir.", 503);
  }

  let input: DeletionInput;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 2048) {
      return failure("Permintaan terlalu besar.", 413);
    }
    input = JSON.parse(text) as DeletionInput;
  } catch {
    return failure("Input tidak sah.", 400);
  }

  const token = authorization.slice(7);
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) {
    return failure("Sesi telah tamat.", 401);
  }

  const currentEmail = data.user.email?.trim().toLowerCase() ?? "";
  if (
    typeof input.confirmationEmail !== "string" ||
    input.confirmationEmail.trim().toLowerCase() !== currentEmail
  ) {
    return failure("Taip alamat e-mel akaun dengan tepat untuk mengesahkan.", 400);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    for (const bucket of ["certificates", "profile-photos", "project-gallery"]) {
      await removeUserFiles(bucket, data.user.id, url, serviceKey);
    }

    // Auth FK cascades remove user-owned rows; cleanup queue preserves any
    // previously enqueued paths for the scheduled orphan cleaner.
    const deletion = await admin.auth.admin.deleteUser(data.user.id);
    if (deletion.error) {
      return failure("Gagal memadam akaun. Hubungi pentadbir.", 500);
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return failure(
      "Pemadaman belum selesai kerana fail Storage tidak dapat dibersihkan. Cuba lagi.",
      500,
    );
  }
}

```

## 18. app/settings/page.tsx

```tsx
"use client";
import Link from "next/link";
import { useEffect,useMemo,useState,type FormEvent } from "react";
import { ArrowLeft,CheckCircle2,Download,Trash2,Eye,EyeOff,KeyRound,LockKeyhole,Mail,Send,ShieldCheck,UserRound } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
export default function AccountSettings(){
 const client=useMemo(()=>getSupabaseClient(),[]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[email,setEmail]=useState(""),[signedIn,setSignedIn]=useState(false);
 const [oldPassword,setOldPassword]=useState(""),[password,setPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState(""),[nonce,setNonce]=useState(""),[visible,setVisible]=useState(false);
 const [success,setSuccess]=useState(""),[error,setError]=useState("");
 const [deleteEmail,setDeleteEmail]=useState("");
 const [confirmDeletion,setConfirmDeletion]=useState(false);
 useEffect(()=>{let active=true;(async()=>{try{const {data,error}=await client.auth.getUser();if(error)throw error;if(active&&data.user){setEmail(data.user.email||"");setSignedIn(true)}}catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load account")}finally{if(active)setLoading(false)}})();return()=>{active=false}},[client]);
 async function act(fn:()=>Promise<void>){setBusy(true);setSuccess("");setError("");try{await fn()}catch(e){setError(e instanceof Error?e.message:"Ralat akaun.")}finally{setBusy(false)}}
 async function changePassword(e:FormEvent){e.preventDefault();await act(async()=>{
  if(password.length<10)throw new Error("Gunakan sekurang-kurangnya 10 aksara untuk kata laluan baharu.");
  if(password!==confirmPassword)throw new Error("Kata laluan baharu dan pengesahan tidak sepadan.");
  if(oldPassword===password)throw new Error("Sila gunakan kata laluan baharu yang berbeza.");
  if(!email)throw new Error("E-mel akaun tidak ditemui.");
  // Confirm user knows their existing password before changing it.
  const {error:checkError}=await client.auth.signInWithPassword({email,password:oldPassword});
  if(checkError)throw new Error("Kata laluan semasa tidak betul.");
  const {error:updateError}=await client.auth.updateUser({password,...(nonce.trim()?{nonce:nonce.trim()}:{})});
  if(updateError)throw updateError;
  setOldPassword("");setPassword("");setConfirmPassword("");setNonce("");
  setSuccess("Kata laluan berjaya ditukar. Gunakan kata laluan baharu untuk log masuk seterusnya.");
 })}
 async function resetPassword(){await act(async()=>{
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/auth/callback?type=recovery"});
  if(error)throw error;
  setSuccess("Jika akaun anda menyokong reset melalui e-mel, pautan akan dihantar ke alamat berdaftar.");
 })}
 async function accessToken(){
   const {data,error:sessionError}=await client.auth.getSession();
   if(sessionError||!data.session)throw new Error("Sila log masuk semula.");
   return data.session.access_token;
 }

 async function exportMyData(){
   await act(async()=>{
     const token=await accessToken();
     const response=await fetch("/api/account/export",{
       headers:{Authorization:`Bearer ${token}`},
       cache:"no-store"
     });
     if(!response.ok)throw new Error("Eksport data gagal.");
     const blob=await response.blob();
     const url=URL.createObjectURL(blob);
     const anchor=document.createElement("a");
     anchor.href=url;
     anchor.download="talentfolio-data-export.json";
     document.body.appendChild(anchor);
     anchor.click();
     anchor.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),1000);
     setSuccess("Data profil berjaya dieksport sebagai fail JSON.");
   });
 }

 async function deleteMyAccount(){
   await act(async()=>{
     if(!confirmDeletion)throw new Error("Sila tandakan pengesahan pemadaman.");
     if(deleteEmail.trim().toLowerCase()!==email.trim().toLowerCase()){
       throw new Error("Alamat e-mel yang ditaip tidak sepadan.");
     }
     const token=await accessToken();
     const response=await fetch("/api/account/delete",{
       method:"POST",
       headers:{
         "Content-Type":"application/json",
         Authorization:`Bearer ${token}`
       },
       cache:"no-store",
       body:JSON.stringify({confirmationEmail:deleteEmail})
     });
     if(!response.ok){
       const body=await response.json() as {error?:string};
       throw new Error(body.error||"Gagal memadam akaun.");
     }
     await client.auth.signOut();
     window.location.replace("/auth?account_deleted=1");
   });
 }

 async function sendNonce(){await act(async()=>{
  const {error}=await client.auth.reauthenticate();if(error)throw error;
  setSuccess("Kod pengesahan semula dihantar ke e-mel anda. Masukkan kod di bawah dan cuba tukar kata laluan.");
 })}
 return <main className="tf-settings-page"><div className="tf-settings-wrap">
  <div className="tf-settings-top"><Link href="/dashboard" className="tf-btn tf-btn-outline"><ArrowLeft size={16}/> Back to Dashboard</Link><span><ShieldCheck size={15}/> Private Account</span></div>
  <div className="tf-eyebrow">ACCOUNT & SECURITY</div><h1>Account Settings</h1><p className="tf-settings-sub">Urus keselamatan akaun dan kata laluan Talentfolio AI anda.</p>
  {loading?<p>Memuatkan akaun...</p>:!signedIn?<section className="tf-card tf-section"><h2>Log masuk diperlukan</h2><p>Sila log masuk sebelum mengubah tetapan akaun.</p><Link className="tf-btn" href="/auth">Log masuk</Link></section>:<>
  <section className="tf-card tf-settings-card"><div className="tf-settings-section-head"><div className="tf-settings-icon"><UserRound size={21}/></div><div><h2>Account Information</h2><p>Alamat e-mel yang dipautkan ke akaun anda.</p></div></div>
   <label>E-mel Berdaftar<div className="tf-settings-readonly"><Mail size={17}/>{email}</div></label><div className="tf-settings-note"><ShieldCheck size={16}/> Alamat e-mel digunakan untuk pengesahan akaun dan pautan reset kata laluan.</div></section>
  <section className="tf-card tf-settings-card"><div className="tf-settings-section-head"><div className="tf-settings-icon"><LockKeyhole size={21}/></div><div><h2>Change Password</h2><p>Untuk keselamatan, sahkan kata laluan semasa sebelum menetapkan yang baharu.</p></div></div>
   <form className="tf-form" onSubmit={e=>void changePassword(e)}>
    <label>Kata Laluan Semasa<input type={visible?"text":"password"} value={oldPassword} onChange={e=>setOldPassword(e.target.value)} autoComplete="current-password" required/></label>
    <div className="tf-formgrid"><label>Kata Laluan Baharu<input type={visible?"text":"password"} minLength={10} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" required placeholder="Minimum 10 aksara"/></label>
    <label>Sahkan Kata Laluan Baharu<input type={visible?"text":"password"} minLength={10} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" required/></label></div>
    <label className="tf-checkbox"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/>{visible?<EyeOff size={16}/>:<Eye size={16}/>} Papar kata laluan</label>
    <details className="tf-nonce-details"><summary>Perlu kod pengesahan tambahan?</summary><p>Jika Supabase mewajibkan pengesahan semula, hantar kod OTP ke e-mel dan masukkan nombor yang diterima.</p><button className="tf-btn tf-btn-outline" type="button" disabled={busy} onClick={()=>void sendNonce()}><Send size={15}/> Hantar Kod</button><label>Kod e-mel (jika diperlukan)<input value={nonce} onChange={e=>setNonce(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="6 digit"/></label></details>
    <button className="tf-btn tf-settings-primary" disabled={busy} type="submit"><KeyRound size={16}/>{busy?"Memproses...":"Change Password"}</button>
   </form>
  </section>
  <section className="tf-card tf-settings-card"><div className="tf-settings-section-head"><div className="tf-settings-icon"><Mail size={21}/></div><div><h2>Reset Password via Email</h2><p>Terlupa kata laluan? Hantar pautan reset ke e-mel akaun anda.</p></div></div><button className="tf-btn tf-btn-outline" disabled={busy} onClick={()=>void resetPassword()}><Mail size={16}/> Send Reset Link</button><p className="tf-hint">Pautan reset akan membuka halaman pemulihan melalui e-mel. Tetapan URL dan SMTP perlu dikonfigurasi di Supabase.</p></section>
  <section className="tf-card tf-settings-card">
   <div className="tf-settings-section-head">
    <div className="tf-settings-icon"><Download size={21}/></div>
    <div><h2>Eksport Data Saya</h2><p>Muat turun metadata profil, projek, pendidikan, kemahiran dan sijil dalam JSON.</p></div>
   </div>
   <button className="tf-btn tf-btn-outline" type="button" disabled={busy}
      onClick={()=>void exportMyData()}><Download size={16}/> Eksport Data Saya (JSON)</button>
   <p className="tf-hint">Fail gambar dan sijil binari tidak dimasukkan; pautan serta metadata disertakan.</p>
  </section>
  <section className="tf-card tf-settings-card tf-account-danger">
   <div className="tf-settings-section-head">
    <div className="tf-settings-icon"><Trash2 size={21}/></div>
    <div><h2>Padam Akaun Secara Kekal</h2><p>Memadam profil, portfolio, rekod dan fail milik anda. Tindakan tidak boleh dibatalkan.</p></div>
   </div>
   <label>Taip e-mel berdaftar sebagai pengesahan
    <input type="email" autoComplete="off" value={deleteEmail}
      placeholder={email} onChange={event=>setDeleteEmail(event.target.value)}/>
   </label>
   <label className="tf-checkbox">
     <input type="checkbox" checked={confirmDeletion}
       onChange={event=>setConfirmDeletion(event.target.checked)}/>
     Saya faham bahawa semua data akaun saya akan dipadam secara kekal.
   </label>
   <button className="tf-btn tf-btn-outline" type="button"
      disabled={busy||!confirmDeletion||deleteEmail.trim().toLowerCase()!==email.trim().toLowerCase()}
      onClick={()=>void deleteMyAccount()}><Trash2 size={16}/> Padam Akaun Saya</button>
   <p className="tf-hint">Pastikan anda membuat eksport data terlebih dahulu. Fungsi ini hanya beroperasi selepas pentadbir mengkonfigurasi key server-side.</p>
  </section>
  {success&&<div role="status" className="tf-settings-success"><CheckCircle2 size={18}/>{success}</div>}
  {error&&<div role="alert" className="tf-settings-error">{error}</div>}
  </>}
 </div></main>
}

```

## 19. next.config.ts

```ts
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const supabaseWs = supabaseOrigin.replace(/^https:/, "wss:");

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js 15 currently emits bootstrap scripts with inline content.
  // Remove unsafe-inline once nonce-based rendering is deployed and tested.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`,
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

```

## 20. supabase/functions/cleanup-orphaned-objects/index.js

```js
// Supabase Edge Function: cleanup-orphaned-objects
// Deploy with --no-verify-jwt, protected by CLEANUP_JOB_SECRET.
// Never expose SUPABASE_SERVICE_ROLE_KEY to browser users.
// Schedule independently in Supabase Dashboard → Cron.
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const required = (name) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server-side configuration: ${name}`);
  return value;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cronSecret = required("CLEANUP_JOB_SECRET");
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createClient(
    required("SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data:jobs, error } = await admin.from("storage_cleanup_jobs")
    .select("id,bucket_id,object_path,attempts")
    .is("processed_at", null)
    .lt("attempts", 10)
    .order("enqueued_at", { ascending: true })
    .limit(50);

  if (error) {
    return Response.json({ error: "Queue unavailable" }, { status: 500 });
  }

  let cleaned = 0;
  let retained = 0;

  for (const job of jobs ?? []) {
    const { bucket_id: bucket, object_path: path } = job;
    const references = {
      "project-gallery": { table: "project_images", field: "storage_path" },
      "certificates": { table: "certificates", field: "storage_path" },
    };

    try {
      if (references[bucket]) {
        const ref = references[bucket];
        const { data, error:lookupError } = await admin.from(ref.table)
          .select("id").eq(ref.field, path).limit(1);
        if (lookupError) throw lookupError;
        if (data?.length) throw new Error("Fail masih dirujuk oleh metadata.");
      } else if (bucket === "profile-photos") {
        const { data, error:lookupError } = await admin.from("profiles")
          .select("user_id").like("avatar_url", `%/profile-photos/${path}`)
          .limit(1);
        if (lookupError) throw lookupError;
        if (data?.length) throw new Error("Foto masih digunakan oleh profil.");
      }

      const removal = await admin.storage.from(bucket).remove([path]);
      if (removal.error && !String(removal.error.message).includes("not found")) {
        throw removal.error;
      }

      const updated = await admin.from("storage_cleanup_jobs").update({
        processed_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", job.id);
      if (updated.error) throw updated.error;
      cleaned += 1;
    } catch (caught) {
      const message = caught instanceof Error
        ? caught.message.slice(0, 150)
        : "Gagal membersihkan fail";
      await admin.from("storage_cleanup_jobs").update({
        attempts: job.attempts + 1,
        last_error: message,
      }).eq("id", job.id);
      retained += 1;
    }
  }

  return Response.json(
    { scanned: jobs?.length ?? 0, cleaned, retained },
    { headers: { "Cache-Control": "no-store" } },
  );
});

```

## 21. components/ai-skills-analysis.tsx

```tsx
"use client";
import {useMemo,useState,useEffect} from "react";
import {BrainCircuit,Copy,Sparkles,KeyRound,Plus,Trash2,Eye,EyeOff,ShieldCheck,AlertTriangle,RotateCcw,CheckCircle2,LockKeyhole,Save,Unlock,ShieldOff} from "lucide-react";
import Link from "next/link";
import {getSupabaseClient} from "@/lib/supabase";
import CareerReport from "@/components/career-report";
import {parseCareerReport} from "@/lib/career-report";
import { GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from "@/lib/gemini-models";
import {encryptVault,decryptVault,vaultStorageKey,type VaultEnvelope} from "@/lib/gemini-key-vault";
type Entry={id:number;label:string;secret:string;visible:boolean};
type Attempt={slot:number;status:string;httpStatus?:number;retryCount?:number};
const MAX_KEYS=5;

export default function AIAnalysis({role,skills}:{role:string;skills:{name:string;self_rating:number|null}[]}){
 const db=useMemo(()=>getSupabaseClient(),[]);
 const [keys,setKeys]=useState<Entry[]>([{id:1,label:"Gemini Key 1",secret:"",visible:false}]);
 const [model,setModel]=useState<string>(DEFAULT_GEMINI_MODEL),[consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false),[result,setResult]=useState(""),[error,setError]=useState("");
 const [attempts,setAttempts]=useState<Attempt[]>([]),[usedSlot,setUsedSlot]=useState<number|null>(null),[copied,setCopied]=useState(false);
 const [vaultOwner,setVaultOwner]=useState<string|null>(null);
 const [vaultExists,setVaultExists]=useState(false),[vaultPassphrase,setVaultPassphrase]=useState(""),[vaultBusy,setVaultBusy]=useState(false),[vaultMessage,setVaultMessage]=useState("");
 useEffect(()=>{let live=true;void db.auth.getUser().then(({data})=>{
  if(!live)return;
  const id=data.user?.id||null;setVaultOwner(id);
  if(id){try{setVaultExists(localStorage.getItem(vaultStorageKey(id))!==null)}catch{setVaultMessage("Storan peranti tidak tersedia. Gunakan key dalam sesi sahaja.");}}
 });return()=>{live=false}},[db]);
 async function saveVault(){
  if(!vaultOwner){setVaultMessage("Log masuk untuk menyimpan key secara peribadi.");return;}
  if(vaultPassphrase.length<12){setVaultMessage("Gunakan kata laluan vault sekurang-kurangnya 12 aksara.");return;}
  setVaultBusy(true);setVaultMessage("");
  try{
   const filled=keys.filter(k=>k.secret.trim()).map(k=>({label:k.label.trim()||"Gemini API Key",secret:k.secret.trim()}));
   const encrypted=await encryptVault(vaultPassphrase,filled);
   localStorage.setItem(vaultStorageKey(vaultOwner),JSON.stringify(encrypted));
   setVaultExists(true);setVaultPassphrase("");setVaultMessage("✓ API key disimpan secara terenkripsi pada peranti ini. Masukkan kata laluan vault untuk membuka semula selepas refresh.");
  }catch(e){setVaultMessage(e instanceof Error?e.message:"Tidak dapat menyimpan vault.");}
  finally{setVaultBusy(false)}
 }
 async function unlockVault(){
  if(!vaultOwner)return;
  setVaultBusy(true);setVaultMessage("");
  try{
   const raw=localStorage.getItem(vaultStorageKey(vaultOwner));
   if(!raw)throw Error("Tiada key tersimpan pada peranti ini.");
   const restored=await decryptVault(vaultPassphrase,JSON.parse(raw) as VaultEnvelope);
   setKeys(restored.map((x,i)=>({id:i+1,label:x.label,secret:x.secret,visible:false})));
   setVaultPassphrase("");setVaultMessage("✓ Semua API key berjaya dibuka. Anda boleh menjalankan analisis Gemini.");
  }catch{setVaultMessage("Tidak dapat membuka vault. Semak kata laluan, atau padam vault dan simpan key baharu.");}
  finally{setVaultBusy(false)}
 }
 function deleteVault(){
  if(!vaultOwner||!confirm("Padam semua API key tersimpan pada peranti ini? Ini tidak membatalkan key di Google AI Studio."))return;
  try{localStorage.removeItem(vaultStorageKey(vaultOwner));setVaultExists(false);setVaultPassphrase("");setVaultMessage("Vault setempat telah dipadam. Key dalam borang masih ada sehingga refresh.");}
  catch{setVaultMessage("Gagal memadam vault setempat.");}
 }
 const [roundRobin,setRoundRobin]=useState(0);
 const [testing,setTesting]=useState(false),[testMessage,setTestMessage]=useState("");
 const valid=keys.map(k=>k.secret.trim()).filter(s=>s.length>=15);
 const analysisPrompt=`Anda ialah penasihat pembangunan kerjaya di Malaysia. Jawatan sasaran saya: ${role}. Penilaian kemahiran berikut adalah penilaian kendiri sahaja:\n${skills.map(s=>`• ${s.name} — ${s.self_rating??"Belum dinilai"}/5`).join("\n")}\n\nBuat ringkasan kekuatan, matriks jurang kemahiran, roadmap 30/60/90 hari, cadangan projek bukti kerja dan kursus. Jangan reka pengalaman atau sijil; tanya jika data tidak mencukupi. Bahasa Melayu Malaysia.`;
 const change=(id:number,field:"secret"|"label"|"visible",value:string|boolean)=>setKeys(prev=>prev.map(x=>x.id===id?{...x,[field]:value}:x));
 async function analyze(){
  if(!consent||valid.length===0)return;
  setBusy(true);setError("");setResult("");setAttempts([]);setUsedSlot(null);
  try{
   const {data:{session},error:sessionError}=await db.auth.getSession();
   if(sessionError||!session)throw Error("Sesi tidak sah. Sila log masuk semula.");
   const ordered=[...valid.slice(roundRobin%valid.length),...valid.slice(0,roundRobin%valid.length)];
   const response=await fetch("/api/skills/analyze",{
    method:"POST",cache:"no-store",
    headers:{"content-type":"application/json",Authorization:`Bearer ${session.access_token}`},
    body:JSON.stringify({role,apiKeys:ordered,model,consent:true})
   });
   const data=await response.json() as {analysis?:string;complete?:boolean;error?:string;usedKeySlot?:number;attempts?:Attempt[];model?:string};
   setAttempts(data.attempts||[]);
   if(!response.ok)throw Error(data.error||"Gemini tidak dapat menjana analisis.");
   if(!data.complete||!data.analysis||parseCareerReport(data.analysis).sections.length!==5)throw Error("Analisis Gemini tidak lengkap dan tidak akan dieksport. Cuba jana semula.");
   setResult(data.analysis);
   const slot=data.usedKeySlot||1;
   setUsedSlot(((roundRobin+slot-1)%valid.length)+1);
   setRoundRobin(v=>(v+slot)%valid.length);
  }catch(e){setError(e instanceof Error?e.message:"Gagal menghubungi Gemini.");}finally{setBusy(false)}
 }
 async function testConnection(){
  const first=keys.find(k=>k.secret.trim().length>=15);
  if(!first)return;
  setTesting(true);setTestMessage("");
  try{
   const {data:{session}}=await db.auth.getSession();
   if(!session)throw new Error("Sila log masuk semula.");
   const response=await fetch("/api/skills/test-connection",{method:"POST",cache:"no-store",
    headers:{"content-type":"application/json",Authorization:`Bearer ${session.access_token}`},
    body:JSON.stringify({apiKey:first.secret.trim(),model})});
   const data=await response.json() as {message?:string;error?:string;seconds?:number;httpStatus?:number};
   setTestMessage(response.ok?`✓ ${data.message||"Berjaya"} (${data.seconds??0}s)`:
    `✕ ${data.error||"Ujian tidak berjaya."} ${data.httpStatus?"HTTP "+data.httpStatus:""}`);
  }catch(e){setTestMessage(e instanceof Error?e.message:"Ujian sambungan gagal.");}
  finally{setTesting(false)}
 }
 async function copy(text:string){try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setError("Gagal menyalin ke clipboard. Sila semak kebenaran browser.");}}
 return <section className="tf-card tf-section tf-ai-panel">
  <div className="tf-card-head"><div><h3><BrainCircuit size={21}/> Gemini Skills Intelligence</h3><p>Analisis kerjaya menggunakan API Gemini anda sendiri, berdasarkan rekod dalam akaun Talentfolio AI.</p></div><span className="tf-pill"><KeyRound size={13}/> Bring Your Own Key</span></div>
  <div className="tf-gemini-intro"><ShieldCheck size={19}/><p><strong>API key milik pengguna.</strong> Anda boleh memasukkan sehingga 5 key. Secara lalai, key hanya berada dalam memori tab. Anda kini boleh memilih <strong>Simpan Terenkripsi pada Peranti</strong> untuk mengekalkannya selepas refresh atau kemas kini website. Key terenkripsi disimpan dalam browser, bukan Supabase atau GitHub. Kata laluan vault tidak disimpan; anda perlu memasukkannya untuk membuka semula key. Key hanya dihantar melalui HTTPS ke backend semasa panggilan Gemini.</p></div>
  <div className="tf-gemini-heading"><h4>1. Pengurusan Gemini API Key</h4><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Dapatkan API key di Google AI Studio ↗</a></div>
  <div className="tf-gemini-key-list">{keys.map((k,i)=><div key={k.id} className="tf-gemini-key-row">
   <span className="tf-gemini-index">#{i+1}</span>
   <div className="tf-gemini-key-input"><label htmlFor={`tf-key-${k.id}`}>Label API Key</label><input aria-label="Nama key" value={k.label} maxLength={40} onChange={e=>change(k.id,"label",e.target.value)}/></div>
   <div className="tf-gemini-secret"><label htmlFor={`tf-key-${k.id}`}>Gemini API Key</label><div><input id={`tf-key-${k.id}`} type={k.visible?"text":"password"} autoComplete="off" spellCheck={false} value={k.secret} onChange={e=>change(k.id,"secret",e.target.value)} placeholder="Masukkan key anda secara manual"/><button type="button" aria-label={k.visible?"Sembunyikan key":"Lihat key"} onClick={()=>change(k.id,"visible",!k.visible)}>{k.visible?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>
   <button type="button" title="Buang key" aria-label={`Buang key ${i+1}`} disabled={keys.length===1||busy} onClick={()=>setKeys(prev=>prev.filter(x=>x.id!==k.id))}><Trash2 size={17}/></button>
  </div>)}</div>
  <div className="tf-gemini-add"><button type="button" className="tf-btn tf-btn-outline" disabled={keys.length>=MAX_KEYS||busy} onClick={()=>setKeys(prev=>[...prev,{id:Math.max(...prev.map(x=>x.id))+1,label:`Gemini Key ${prev.length+1}`,secret:"",visible:false}])}><Plus size={15}/> Tambah API Key ({keys.length}/{MAX_KEYS})</button><small>{valid.length} key telah diisi · Satu key akan digunakan untuk setiap percubaan. Key lain dicuba jika had kuota atau ralat penyedia berlaku.</small></div>
  <div className="tf-gemini-vault">
   <div className="tf-gemini-vault-title"><LockKeyhole size={19}/><div><h4>Simpan API Key (Terenkripsi pada Peranti)</h4><p>{vaultExists?"Vault tersimpan pada browser ini. Ia akan kekal selepas refresh/deployment.":"Belum ada key disimpan. Simpan secara pilihan supaya tidak perlu tampal semula setiap kali."}</p></div></div>
   <p className="tf-gemini-vault-note">Key disulitkan dengan AES-GCM dan kata laluan pilihan anda. Storan ini hanya tersedia pada browser/peranti dan akaun yang sama. Jika anda memadam data browser, bertukar peranti atau terlupa kata laluan, key tidak dapat dipulihkan daripada vault. Jangan gunakan peranti awam.</p>
   <label className="tf-gemini-vault-input">Kata laluan vault (minimum 12 aksara)<input type="password" autoComplete="new-password" minLength={12} value={vaultPassphrase} onChange={e=>setVaultPassphrase(e.target.value)} placeholder="Kata laluan khusus untuk melindungi key"/></label>
   <div className="tf-gemini-vault-actions"><button type="button" className="tf-btn" disabled={!vaultOwner||vaultBusy||!valid.length||vaultPassphrase.length<12} onClick={()=>void saveVault()}><Save size={15}/>{vaultBusy?"Memproses...":"Simpan Key Terenkripsi"}</button>
    {vaultExists&&<button type="button" className="tf-btn tf-btn-outline" disabled={vaultBusy||vaultPassphrase.length===0} onClick={()=>void unlockVault()}><Unlock size={15}/>Buka Key Tersimpan</button>}
    {vaultExists&&<button type="button" className="tf-btn tf-btn-outline" disabled={vaultBusy} onClick={deleteVault}><ShieldOff size={15}/>Padam Vault</button>}
   </div>
   {vaultMessage&&<p role="status" className="tf-gemini-vault-message">{vaultMessage}</p>}
  </div>
  <div className="tf-gemini-settings"><div><h4>2. Pilihan model & sasaran</h4><p>Jawatan sasaran: <strong>{role}</strong></p></div><label>Model Gemini<select value={model} onChange={e=>setModel(e.target.value)} disabled={busy}>{GEMINI_MODELS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label></div>
  <div className="tf-gemini-quota"><AlertTriangle size={18}/><p><strong>Kuota tidak semestinya bertambah dengan banyak key.</strong> Google menetapkan kebanyakan had penggunaan mengikut projek Google Cloud, bukan setiap key. Jika semua key daripada projek sama, bertukar key mungkin tidak menyelesaikan had kuota. Pastikan penggunaan setiap key mematuhi polisi Google dan tetapan billing anda.</p></div>
  <label className="tf-ai-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Saya faham API key saya akan dihantar ke pelayan Talentfolio AI untuk panggilan Gemini, dan data kemahiran, projek, pendidikan, pengalaman serta nama sijil saya akan dihantar kepada Google untuk dianalisis. Saya bersetuju meneruskan.</label>
  <div className="tf-gemini-run"><button type="button" className="tf-btn tf-btn-outline" disabled={busy||testing||valid.length===0} onClick={()=>void testConnection()}><KeyRound size={15}/>{testing?"Menguji sambungan...":"Uji Sambungan Gemini"}</button><button className="tf-btn" type="button" disabled={busy||!consent||valid.length===0||skills.length===0} onClick={()=>void analyze()}><Sparkles size={16}/>{busy?"Gemini sedang menganalisis…":"Generate Skills Analysis (Gemini)"}</button><span>{!valid.length?"Masukkan sekurang-kurangnya 1 API key.":!consent?"Tandakan persetujuan sebelum menjana analisis.":"Sedia menjana analisis berdasarkan profil anda."}</span></div>
  {testMessage&&<p role="status" className="tf-hint" style={{marginBottom:15}}>{testMessage}</p>}
  {error&&<div className="tf-ai-error" role="alert">{error}{!!attempts.length&&<ul>{attempts.map(a=><li key={a.slot}>Percubaan key #{a.slot}{a.httpStatus?` · HTTP ${a.httpStatus}`:""}: {a.status}</li>)}</ul>}</div>}
  {result&&<><CareerReport text={result} role={role} model={model} usedSlot={usedSlot} onCopy={()=>void copy(result)}/>{attempts.length>0&&<p className="tf-hint">Key sebelumnya tidak berjaya: {attempts.map(a=>`#${a.slot} (${a.status})`).join(", ")}</p>}</>}
  <div className="tf-gemini-fallback"><div><strong>Tiada API key? Gunakan AI pilihan anda.</strong><p>Anda masih boleh salin prompt analisis profesional dan tampal dalam ChatGPT, Gemini atau Claude tanpa sambungan API pada website.</p></div><button className="tf-btn tf-btn-outline" type="button" onClick={()=>void copy(analysisPrompt)}><Copy size={14}/>{copied?"Disalin":"Salin Prompt Analisis"}</button><Link href="/prompt-generator">Buka Prompt Generator</Link></div>
  <p className="tf-muted">Gemini memberikan cadangan berdasarkan data kendiri; ia tidak mengesahkan sijil atau tahap kemahiran. Setiap panggilan API tertakluk kepada kuota dan caj akaun Google anda.</p>
 </section>;
}

```

## 22. .env.example

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Gemini Skills Analysis uses user-provided Gemini API keys at runtime.
# Keys are never saved in this repository or in an environment variable.
# PRIVATE: server-only. Never prefix with NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=
# Set CLEANUP_JOB_SECRET only in Supabase Edge Function secrets.

```

## 23. app/quality-fixes.css

```css
/* Talentfolio fixes: accessible skill edit, dark mode, file input, site preview, long-form bio, premium CV */
.tf-theme-toggle{display:inline-grid;place-items:center;width:37px;height:37px;border:1px solid #d8e0ed;border-radius:11px;background:#fff;color:#4d637d}.tf-theme-toggle:hover{background:#eef2ff;color:#4367d3}.tf-skill-presets{display:flex;gap:6px;flex-wrap:wrap}.tf-skill-presets button{padding:7px 11px;border:1px solid #dfe7f3;border-radius:99px;font-size:10px;font-weight:700;color:#53647d;background:#f8faff}.tf-skill-presets button.active{color:#fff;background:#4567e7;border-color:#4567e7}.tf-skill-list{margin-top:18px}.tf-ai-panel{margin-top:20px}.tf-ai-panel .tf-card-head h3{display:flex;align-items:center;gap:8px}.tf-ai-panel>.tf-btn{margin:17px 0}.tf-ai-error{background:#fff3e7;color:#844e11;border:1px solid #f2d2a2;padding:15px;border-radius:10px;font-size:12px}.tf-ai-error p{margin-bottom:0}.tf-ai-error a{text-decoration:underline}.tf-ai-result{border:1px solid #cad9ef;border-radius:12px;background:#f8fbff;padding:20px}.tf-ai-result>.tf-form-actions{display:flex;align-items:center;justify-content:space-between}.tf-ai-content{font-size:13px;line-height:1.9;color:#293d5f;white-space:pre-wrap;margin-top:17px}
.tf-tool-page{max-width:1300px;margin:auto;padding:35px}.tf-tool-hero{padding:45px 40px;background:linear-gradient(125deg,#162955,#4657a2);color:white;border-radius:20px;margin-bottom:22px}.tf-tool-hero>span{display:flex;align-items:center;gap:9px;font-size:11px;letter-spacing:2px;color:#b8cdff}.tf-tool-hero h1{font:800 clamp(26px,3vw,43px) 'Plus Jakarta Sans';margin:14px 0}.tf-tool-hero p{font-size:13px;line-height:1.85;color:#d1def9;max-width:780px}.tf-tool-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.tf-generated-prompt{display:block;width:100%;padding:16px;line-height:1.75;border:1px solid #d9e3f0;border-radius:11px;background:#f8fbff;resize:vertical;color:#243957;font-size:12px;margin-bottom:17px}
.tf-gallery-upload input[type=file]{font-size:0;width:100%;color:transparent;max-width:330px;margin:14px auto;border:1px dashed #a0b6e5;padding:12px;background:#fff;border-radius:10px;cursor:pointer}.tf-gallery-upload input[type=file]::file-selector-button{border:0;border-radius:8px;background:#4b6ef0;color:#fff;font-size:12px;font-weight:800;padding:12px 17px;cursor:pointer;margin-right:12px}.tf-gallery-upload input[type=file]:focus-visible{outline:3px solid #a5bbfc;outline-offset:2px}
.tf-project-media{height:100%;width:100%;position:relative;overflow:hidden;background:linear-gradient(145deg,#eff3fb,#b9ccef);display:grid;place-items:center}.tf-project-media iframe{width:130%;height:130%;border:0;transform:scale(.77);pointer-events:none;transform-origin:center;background:#fff}.tf-project-media-label{position:absolute;top:9px;left:9px;padding:6px 9px;display:flex;align-items:center;gap:5px;color:#fff;background:#162947d9;border-radius:6px;font-size:9px;font-weight:800;letter-spacing:.07em}.tf-project-media-open,.tf-media-visit{position:absolute;bottom:10px;right:10px;display:inline-flex;gap:7px;align-items:center;border:1px solid #dce5ff;background:#142441e8;color:#fff!important;border-radius:8px;padding:8px 11px;font-size:10px;font-weight:800;z-index:5}.tf-media-fallback{position:absolute;bottom:11px;left:8px;color:#fff;background:#15263abf;padding:5px;font-size:9px;max-width:60%}.tf-project-media-empty{color:#758cae;display:flex;flex-direction:column;gap:7px;font-size:11px}.tf-project-media-images .pg-public-cover{position:absolute;inset:0}.tf-project-media-images .pg-photo-button{height:100%;width:100%}
.tpl-project-visual .tf-project-media,.ex-project-cover .tf-project-media,.tf-public-v2-project-art .tf-project-media{position:absolute;inset:0;z-index:3}.tf-pv-project .tf-project-media{height:138px;border-radius:11px;margin:10px 0}.tpl-project-visual .tf-project-media-open,.ex-project-cover .tf-project-media-open{font-size:9px}
/* Long biographies: do not hide text within hero or force a fixed height */
.tpl-crimson .tpl-crimson-hero{height:auto;min-height:760px;overflow:visible}.tpl-crimson .tpl-crimson-copy{position:relative;top:auto;left:auto;z-index:5;padding:230px 0 70px 7%;max-width:390px}.tpl-crimson .tpl-crimson-copy p{max-width:none;line-height:1.8;overflow-wrap:anywhere;white-space:pre-line}.tpl-crimson .tpl-crimson-portrait{z-index:2}.tpl-crimson .tpl-crimson-side{z-index:4}.tpl-neon .tpl-neon-hero,.tpl-amber .tpl-amber-hero,.ex-luxe .ex-luxe-hero{height:auto;min-height:unset}.tpl-hero-copy>p,.tpl-neon-copy>p,.ex-luxe-side p,.ex-student-copy p,.ex-sunny-copy p{max-height:none;overflow:visible;white-space:pre-line;overflow-wrap:anywhere}.ex-luxe-hero{min-height:750px!important}.ex-sunny-hero{height:auto;min-height:720px}.ex-sunny-copy{position:relative;left:auto;bottom:auto;padding:510px 0 55px 6%;width:50%;max-width:580px}.ex-sunny-photo{bottom:auto;top:295px;height:380px}
/* CV studio */
.tf-resume-v2{min-height:100vh;background:#edf1f8;padding:25px 20px 70px;color:#233853}.tf-resume-controls{max-width:1000px;margin:0 auto 25px;display:flex;align-items:center;justify-content:space-between;gap:14px}.tf-resume-controls>div{display:grid;text-align:center}.tf-resume-controls>div strong{font:800 20px 'Plus Jakarta Sans'}.tf-resume-controls>div span{font-size:11px;color:#7d8a9e}.tf-resume-toolbar-v2{max-width:1000px;margin:0 auto 15px;background:#fff;padding:22px;border:1px solid #dfe7f4;border-radius:15px}.tf-resume-toolbar-v2 h2{font:800 17px 'Plus Jakarta Sans';margin:0}.tf-resume-toolbar-v2 p{font-size:11px;color:#8090a4}.tf-resume-choices{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.tf-resume-choices button{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:13px 18px;border-radius:9px;border:2px solid #e0e7f0;background:#f9fbff;color:#2b405a;min-width:145px}.tf-resume-choices button.selected{border-color:#4b6dee;background:#f0f4ff}.tf-resume-choices b{font-size:12px}.tf-resume-choices span{font-size:10px;color:#75849a}.tf-resume-options{display:flex;gap:20px;flex-wrap:wrap;margin-top:15px;font-size:11px;color:#546b89}.tf-resume-options label{display:flex;gap:7px;align-items:center}.tf-resume-options input{accent-color:#4b6eee}.tf-resume-hint{max-width:1000px;margin:0 auto 20px;display:flex;align-items:center;gap:9px;color:#63758e;font-size:11px}.tf-resume-document{--cv-ink:#20304a;--cv-accent:#304e85;--cv-soft:#edf2f9;width:210mm;max-width:100%;margin:0 auto;background:#fff;min-height:297mm;padding:19mm 19mm 16mm;box-shadow:0 18px 48px #21345520;color:var(--cv-ink);font-family:Arial,'DM Sans',sans-serif;font-size:10.5pt;line-height:1.55;overflow-wrap:anywhere}.tf-resume-document.tf-resume-modern{--cv-ink:#1d354d;--cv-accent:#477ee4;--cv-soft:#eaf3ff}.tf-resume-document.tf-resume-creative{--cv-ink:#32243f;--cv-accent:#a252c3;--cv-soft:#f8ebff;border-top:11px solid #722da3}.tf-cv-header{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:19px;border-bottom:3px solid var(--cv-accent)}.tf-cv-id{flex:1;min-width:0}.tf-cv-id>span{font-size:8.5pt;letter-spacing:2px;color:var(--cv-accent);font-weight:800}.tf-cv-id h1{font:900 clamp(23pt,3.2vw,37pt)/1.14 'Plus Jakarta Sans',Arial,sans-serif;letter-spacing:-1.1px;margin:8px 0;overflow-wrap:anywhere}.tf-cv-id h2{font-size:12pt;font-weight:600;color:#65758b;margin:6px 0}.tf-cv-portrait{width:99px;height:118px;border-radius:14px;flex:none;background:var(--cv-soft);display:grid;place-items:center;color:var(--cv-accent);overflow:hidden}.tf-cv-portrait img{width:100%;height:100%;object-fit:cover}.tf-cv-contacts{display:flex;gap:13px;align-items:center;flex-wrap:wrap;font-size:9pt;color:#5c6d81;padding:14px 0}.tf-cv-contacts span,.tf-cv-contacts a{display:inline-flex;align-items:center;gap:5px;overflow-wrap:anywhere}.tf-cv-section{margin-top:27px}.tf-cv-section h3{color:var(--cv-accent);font-size:10pt;letter-spacing:1.6px;padding:0 0 8px;border-bottom:1px solid #dce4ef;margin:0 0 15px;font-weight:900}.tf-cv-summary,.tf-cv-entry>p,.tf-cv-project p{font-size:9.5pt;line-height:1.75;margin:10px 0;white-space:pre-line;overflow-wrap:anywhere}.tf-cv-entry{padding:0 0 14px;margin:0 0 14px;border-bottom:1px solid #edf1f5;break-inside:avoid-page}.tf-cv-entry-top{display:flex;justify-content:space-between;gap:20px}.tf-cv-entry h4,.tf-cv-project h4{font-size:11.5pt;font-weight:800;margin:0 0 5px}.tf-cv-entry b{font-size:9.5pt;color:#5d6d82}.tf-cv-entry-top>span{font-size:9pt;color:var(--cv-accent);font-weight:800;text-align:right;min-width:max-content}.tf-cv-skills{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px}.tf-cv-skills span{padding:6px 10px;background:var(--cv-soft);border-radius:6px;font-size:9pt}.tf-cv-section>small{font-size:8pt;color:#8e9aab}.tf-cv-project{display:flex;gap:15px;border-bottom:1px solid #edf1f5;padding:0 0 15px;margin-bottom:15px;break-inside:avoid-page}.tf-cv-project>div{min-width:0;flex:1}.tf-cv-project-img{width:113px;height:89px;flex:none;object-fit:cover;border-radius:7px;border:1px solid #dfe5ef}.tf-cv-project a{font-size:9pt;color:var(--cv-accent);overflow-wrap:anywhere}.tf-cv-footer{border-top:1px solid #e1e7ef;margin-top:32px;padding-top:10px;font-size:8pt;color:#9ba4b1}.tf-resume-creative .tf-cv-header{background:linear-gradient(125deg,#39224e,#76369f);color:white;border-bottom:0;border-radius:10px;padding:22px}.tf-resume-creative .tf-cv-id>span,.tf-resume-creative .tf-cv-id h2{color:#eacbff}.tf-resume-creative .tf-cv-portrait{border:3px solid #fff6}
/* Dark mode is optional and personal; print retains white */
html.tf-dark body{background:#0e1626;color:#e6eefb}html.tf-dark .tf-main,html.tf-dark .tf-content{background:#0e1626;color:#e6eefb}html.tf-dark .tf-topbar{background:#172339;border-color:#30425e}html.tf-dark .tf-top-left strong,html.tf-dark .tf-headingrow h1,html.tf-dark .tf-stat>strong{color:#eaf1ff}html.tf-dark .tf-card,html.tf-dark .tf-stat,html.tf-dark .tf-certificate{background:#17243b;border-color:#344660;box-shadow:0 8px 24px #0003;color:#dce7f9}html.tf-dark .tf-card-head h3,html.tf-dark .tf-listrow b,html.tf-dark .tf-form label,html.tf-dark .tf-section h3{color:#edf3ff}html.tf-dark .tf-form input:not([type=checkbox]),html.tf-dark .tf-form textarea,html.tf-dark .tf-form select,html.tf-dark .tf-gallery-fields input,html.tf-dark .tf-gallery-fields textarea,html.tf-dark .tf-gallery-item textarea{background:#101b2e;color:#eaf1ff;border-color:#3c4e69}html.tf-dark .tf-gallery-fields,html.tf-dark .tf-gallery-item,html.tf-dark .tf-gallery-upload{background:#192943;border-color:#374d6c}html.tf-dark .tf-gallery-upload p,html.tf-dark .tf-hint{color:#afc0dc}html.tf-dark .tf-gallery-projects button,html.tf-dark .tf-skill-presets button{background:#273855;color:#e1eafb;border-color:#41567a}html.tf-dark .tf-gallery-projects button.active,html.tf-dark .tf-skill-presets button.active{background:#526ff5}html.tf-dark .tf-btn-outline,html.tf-dark .tf-theme-toggle{background:#253751;color:#e9f1ff;border-color:#455d83}html.tf-dark .tf-listrow{border-color:#30405d}html.tf-dark .tf-insight{background:#243654;border-color:#3f5278;color:#c5d5f3}html.tf-dark .tf-track{background:#273752}html.tf-dark .tf-ai-result{background:#1c2c46;border-color:#405779}html.tf-dark .tf-ai-content{color:#e7eeff}html.tf-dark .tf-tool-page{background:#0e1626;color:#e4ecfa}html.tf-dark .tf-generated-prompt{background:#15223a;color:#e7f0ff;border-color:#394b68}html.tf-dark .tf-resume-v2{background:#101a2c;color:#eaf1ff}html.tf-dark .tf-resume-toolbar-v2{background:#182843;border-color:#324966;color:#e9f0fb}html.tf-dark .tf-resume-choices button{background:#263852;border-color:#3d5070;color:#eaf1ff}html.tf-dark .tf-resume-document{color:var(--cv-ink);background:#fff}
@media(max-width:760px){.tf-tool-page{padding:16px}.tf-tool-hero{padding:30px 22px}.tf-tool-grid{grid-template-columns:1fr}.tf-cv-entry-top{flex-direction:column;gap:4px}.tf-cv-entry-top>span{text-align:left}.tf-resume-controls{flex-wrap:wrap;justify-content:center}.tf-resume-controls>div{order:-1;width:100%}.tf-resume-document{padding:22px 16px;min-height:auto}.tf-cv-portrait{width:65px;height:80px}.tf-resume-choices button{min-width:115px}.tf-cv-project-img{width:80px;height:67px}.tf-cv-id h1{font-size:22pt}.tpl-crimson .tpl-crimson-hero{min-height:770px}.tpl-crimson .tpl-crimson-copy{padding:145px 10px 22px 5%;max-width:80%}.tpl-crimson .tpl-crimson-side{top:auto;bottom:20px}.ex-sunny-copy{padding:525px 15px 40px;width:100%}.ex-sunny-photo{right:3%;top:180px;width:71%;height:340px}}
@media print{@page{size:A4;margin:10mm}.tf-resume-v2{padding:0;background:#fff!important}.tf-resume-controls,.tf-resume-toolbar-v2,.tf-resume-hint{display:none!important}.tf-resume-document{width:100%;max-width:none;box-shadow:none;min-height:0;padding:0!important;background:white!important;color:var(--cv-ink)!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}.tf-cv-header,.tf-cv-entry,.tf-cv-project{break-inside:avoid-page}.tf-cv-section{break-before:auto}.tf-cv-project-img,.tf-cv-portrait img{print-color-adjust:exact;-webkit-print-color-adjust:exact}html.tf-dark .tf-resume-document{color:#26314b!important;background:#fff!important}}

.tf-file-dropzone{width:100%;min-height:85px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;padding:14px;border:2px dashed #b1c5f5;border-radius:12px;background:#f7faff;margin:12px 0}.tf-file-dropzone.drag-active{background:#dfe9ff;border-color:#4a70ed}.tf-file-select{display:inline-flex;align-items:center;gap:9px;border:0;border-radius:9px;padding:12px 20px;background:#4d6ff3;color:white;font-weight:800;font-size:12px;box-shadow:0 7px 16px #355be52a}.tf-file-select:disabled{opacity:.5}.tf-file-dropzone>span{font-size:10px;color:#667ea1}.tf-file-preview-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}.tf-file-preview-list>div{background:#fff;border:1px solid #e3eaf8;border-radius:8px;overflow:hidden;min-width:0}.tf-file-preview-list img{width:100%;height:82px;object-fit:cover;display:block}.tf-file-preview-list small{display:block;font-size:9px;color:#6a7e99;padding:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tf-file-name-list{display:grid;gap:5px}.tf-file-name-list span{font-size:10px;color:#6b7c92;overflow-wrap:anywhere}html.tf-dark .tf-file-dropzone{background:#202e47;border-color:#49678c}html.tf-dark .tf-file-dropzone>span{color:#b5c5e4}html.tf-dark .tf-file-preview-list>div{background:#18263d;border-color:#445979}html.tf-dark .tf-file-preview-list small{color:#b9cae5}

.tf-file-dropzone input[hidden]{display:none!important}

.tf-ai-consent{display:flex;align-items:flex-start;gap:10px;font-size:12px;color:#526580;line-height:1.75;margin-top:18px}.tf-ai-consent input{accent-color:#496bea;flex:none;margin-top:5px}html.tf-dark .tf-ai-consent{color:#c0d0e9}

/* Complete dark appearance for account, authentication and all workspace controls */
html.tf-dark .tf-settings-page,html.tf-dark .tf-auth-page{background:#0e1626;color:#e9effb}html.tf-dark .tf-auth-right{background:#111d30}html.tf-dark .tf-auth-card h2,html.tf-dark .tf-settings-wrap h1,html.tf-dark .tf-settings-section-head h2{color:#eef4ff}html.tf-dark .tf-auth-sub,html.tf-dark .tf-settings-sub{color:#a8bad4}html.tf-dark .tf-auth-card label,html.tf-dark .tf-settings-card>label{color:#cbdaf1}html.tf-dark .tf-auth-input,html.tf-dark .tf-auth-card .tf-auth-input input{background:#192841;color:#f2f5ff;border-color:#425577}html.tf-dark .tf-auth-switch{border-color:#3b4b64}html.tf-dark .tf-settings-readonly{background:#1b2b43;border-color:#394e70;color:#e3ebf7}html.tf-dark .tf-settings-note,html.tf-dark .tf-settings-top>span{color:#b7c4dd}html.tf-dark .tf-nonce-details{background:#182941;border-color:#3f5476}html.tf-dark .tf-nonce-details p{color:#b8c8e1}html.tf-dark .tf-settings-card .tf-form input{background:#101d32;color:#eef4ff;border-color:#3f5272}html.tf-dark .tf-resume-choices button.selected{background:#314977;color:#fff;border-color:#628cff}html.tf-dark .tf-resume-hint{color:#b0c1db}html.tf-dark .tf-gallery-privacy{background:#453b26;border-color:#866f39;color:#ffe3a5}html.tf-dark .tf-gallery-privacy strong{color:#fff0c6}html.tf-dark .tf-filterbar .tf-search{background:#1c2e49;color:#d1def1;border-color:#456186}html.tf-dark .tf-filterbar .tf-search input{background:transparent;color:#eef6ff}html.tf-dark .tf-segments{background:#283a59}html.tf-dark .tf-segments button.active{background:#425d91;color:#fff}html.tf-dark .tf-template-card{background:#1b2b45;border-color:#3a5379;color:#f5f8ff}html.tf-dark .tf-template-card.selected{border-color:#6b8efa}html.tf-dark .tf-template-caption small{color:#bbcee8}html.tf-dark .tf-photo-editor h4,html.tf-dark .tf-gallery-fields h4{color:#eef4ff}html.tf-dark .tf-photo-privacy,html.tf-dark .tf-photo-action p{color:#b6c5df}html.tf-dark .tf-gallery-privacy p{color:#e5cd9b}html.tf-dark .tf-gallery-selection{color:#e3efff}html.tf-dark .tf-stat>div,html.tf-dark .tf-listrow p{color:#bccae0}html.tf-dark .tf-signedout{color:#e5efff}html.tf-dark .tf-welcome{color:#fff}


/* Gemini BYOK key manager — keys remain in React memory only */
.tf-gemini-intro,.tf-gemini-quota{display:flex;align-items:flex-start;gap:12px;padding:16px 17px;border:1px solid #d5e4f7;background:#f0f7ff;border-radius:12px;margin:15px 0 24px;color:#345372;font-size:12px;line-height:1.8}
.tf-gemini-intro svg,.tf-gemini-quota svg{flex:none;margin-top:4px;color:#4770d7}.tf-gemini-intro p,.tf-gemini-quota p{margin:0}.tf-gemini-quota{background:#fffae8;border-color:#edd99c;color:#806022}.tf-gemini-quota svg{color:#b17d1d}
.tf-gemini-heading,.tf-gemini-settings{display:flex;align-items:center;justify-content:space-between;gap:15px;margin:20px 0 15px}.tf-gemini-heading h4,.tf-gemini-settings h4{font:800 14px 'Plus Jakarta Sans',sans-serif;color:#273f60;margin:0}.tf-gemini-heading>a{font-size:11px;color:#416ae5;font-weight:800;text-decoration:none}
.tf-gemini-key-list{display:grid;gap:11px}.tf-gemini-key-row{display:grid;grid-template-columns:40px minmax(120px,.7fr) minmax(180px,1.5fr) 37px;align-items:end;gap:10px;border:1px solid #dce5f5;background:#f9fbff;padding:13px;border-radius:12px}.tf-gemini-index{font-size:12px;font-weight:900;background:#e8eefe;color:#415d9e;border-radius:9px;display:grid;place-items:center;width:36px;height:38px}
.tf-gemini-key-input,.tf-gemini-secret{display:grid;gap:7px;min-width:0}.tf-gemini-key-input label,.tf-gemini-secret label,.tf-gemini-settings label{font-size:10px;color:#536986;font-weight:800}.tf-gemini-key-input>input,.tf-gemini-secret input,.tf-gemini-settings select{padding:11px;border:1px solid #d7e0ef;border-radius:8px;background:#fff;color:#263d59;font-size:12px;width:100%;outline:none;min-width:0}
.tf-gemini-secret>div{display:flex;align-items:stretch;min-width:0}.tf-gemini-secret>div input{border-radius:8px 0 0 8px}.tf-gemini-secret>div button{display:grid;place-items:center;border:1px solid #d8e1ee;border-left:0;border-radius:0 8px 8px 0;background:#f1f4fa;color:#526c8b;padding:0 11px}
.tf-gemini-key-row>button{height:40px;border:1px solid #e4eaf3;border-radius:8px;background:#fff;color:#9b525b;display:grid;place-items:center}.tf-gemini-key-row>button:disabled{opacity:.3}.tf-gemini-add{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin:14px 0 24px}.tf-gemini-add small{color:#71839a;font-size:10px;line-height:1.6}.tf-gemini-settings{border-top:1px solid #e5ebf4;padding-top:22px}.tf-gemini-settings p{font-size:11px;color:#6b7d91;margin:7px 0}.tf-gemini-settings label{display:grid;gap:7px;min-width:225px}.tf-gemini-run{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:15px 0 25px}.tf-gemini-run>span{font-size:11px;color:#617998}.tf-gemini-fallback{display:flex;gap:15px;align-items:center;justify-content:space-between;flex-wrap:wrap;border-top:1px solid #e8edf5;padding:20px 0;margin-top:26px}.tf-gemini-fallback>div{flex:1;min-width:190px}.tf-gemini-fallback strong{font-size:12px;color:#283f60}.tf-gemini-fallback p{font-size:11px;color:#68809b;line-height:1.7}.tf-gemini-fallback>a{font-size:11px;font-weight:800;color:#466ee6}.tf-ai-result .tf-form-actions strong{display:flex;gap:8px;align-items:center}.tf-gemini-intro strong{color:#254e91}
/* Expanded Prompt Generator Pro */
.tf-prompt-v2 .tf-tool-hero{margin-bottom:15px}.tf-prompt-progress{display:inline-flex;gap:8px;align-items:center;margin-top:14px;border:1px solid #97aee066;border-radius:99px;padding:8px 13px;font-size:11px;background:#ffffff18}
.tf-prompt-kind-tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:18px 0}.tf-prompt-kind-tabs>button{border:1px solid #dee6f3;border-radius:13px;background:#fff;display:grid;gap:8px;justify-items:start;text-align:left;padding:15px;min-width:0;color:#5d7290;transition:border-color .2s,transform .2s}.tf-prompt-kind-tabs>button:hover{transform:translateY(-2px)}.tf-prompt-kind-tabs>button.active{background:#eef3ff;border:2px solid #516df3;padding:14px;color:#3455be}.tf-prompt-kind-tabs b{font-size:12px;color:#284160}.tf-prompt-kind-tabs small{font-size:10px;line-height:1.5;opacity:.85}
.tf-prompt-grid{grid-template-columns:minmax(0,1fr) minmax(0,.9fr);align-items:start}.tf-prompt-editor{display:grid;gap:17px}.tf-prompt-editor .tf-card{margin:0}.tf-prompt-editor .tf-form{gap:14px}.tf-prompt-editor textarea{resize:vertical}.tf-prompt-example{border:1px dashed #b6c8ee;padding:12px;border-radius:9px;background:#f6f9ff}.tf-prompt-example button{display:inline-flex;gap:7px;align-items:center;color:#466aca;font-weight:800;font-size:11px;border:0;background:transparent}.tf-prompt-example p{color:#546783;font-size:11px;line-height:1.8}.tf-prompt-example small{font-style:italic;color:#8191a7}.tf-prompt-summary{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 18px}.tf-prompt-summary span{background:#ebf1ff;border:1px solid #d6e1fd;border-radius:99px;color:#4a63a4;padding:6px 10px;font-size:10px;font-weight:800}.tf-prompt-output{position:sticky;top:12px}.tf-prompt-output .tf-generated-prompt{min-height:540px;max-height:75vh;resize:vertical;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;line-height:1.8}
html.tf-dark .tf-gemini-intro{background:#203657;color:#c4d9fa;border-color:#375a8e}html.tf-dark .tf-gemini-intro strong{color:#d3e4ff}html.tf-dark .tf-gemini-quota{background:#493d25;color:#f5dfaf;border-color:#80673b}html.tf-dark .tf-gemini-key-row{background:#1c2c47;border-color:#3d5175}html.tf-dark .tf-gemini-key-input input,html.tf-dark .tf-gemini-secret input,html.tf-dark .tf-gemini-settings select{background:#14243b;color:#f4f7ff;border-color:#405a7f}html.tf-dark .tf-gemini-secret>div button,html.tf-dark .tf-gemini-key-row>button{background:#30445f;color:#f0f5ff;border-color:#466181}html.tf-dark .tf-gemini-index{background:#354b77;color:#d8e5ff}html.tf-dark .tf-gemini-heading h4,html.tf-dark .tf-gemini-settings h4,html.tf-dark .tf-gemini-fallback strong{color:#e8f0ff}html.tf-dark .tf-gemini-key-input label,html.tf-dark .tf-gemini-secret label,html.tf-dark .tf-gemini-settings label{color:#c0d1eb}html.tf-dark .tf-gemini-add small,html.tf-dark .tf-gemini-settings p,html.tf-dark .tf-gemini-run span,html.tf-dark .tf-gemini-fallback p{color:#b2c4e2}html.tf-dark .tf-prompt-kind-tabs>button{background:#1e2c45;border-color:#364b6d;color:#b8ccec}html.tf-dark .tf-prompt-kind-tabs>button.active{background:#263e6d;border-color:#7896ff}html.tf-dark .tf-prompt-kind-tabs b{color:#ecf3ff}html.tf-dark .tf-prompt-example{background:#203657;border-color:#41638c}html.tf-dark .tf-prompt-example p{color:#c3d4ee}html.tf-dark .tf-prompt-summary span{background:#263b64;border-color:#476597;color:#d2e3ff}
@media(max-width:1100px){.tf-prompt-kind-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}.tf-prompt-grid{grid-template-columns:1fr}.tf-prompt-output{position:static}}@media(max-width:700px){.tf-gemini-key-row{grid-template-columns:35px 1fr 38px}.tf-gemini-key-row .tf-gemini-secret{grid-column:2;grid-row:2}.tf-gemini-key-row>button{grid-column:3;grid-row:2}.tf-gemini-heading,.tf-gemini-settings{align-items:flex-start;flex-direction:column}.tf-gemini-settings label{width:100%}.tf-prompt-kind-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.tf-prompt-v2 .tf-tool-page{padding:12px}.tf-prompt-output .tf-generated-prompt{min-height:420px}}


/* v4.8 — dependable link-based project media. Never embed external websites in iframes:
   X-Frame-Options, CSP, login walls and redirect pages often make them blank. */
.tf-project-media.tf-project-media-poster{
 display:flex;flex-direction:column;justify-content:space-between;gap:7px;
 isolation:isolate;position:relative;overflow:hidden;min-width:0;
 color:#e6efff;background:linear-gradient(142deg,#14253b 0%,#1a3658 52%,#112134 100%);
 padding:13px 13px 11px;border:0;
}
.tf-project-media-poster .tf-media-glow{pointer-events:none;position:absolute;inset:-70% -35% 0 -50%;
 background:radial-gradient(ellipse at 80% 80%,#477bf36b,transparent 56%);z-index:-1}
.tf-media-browser{align-self:center;display:flex;flex-direction:column;flex:1;min-height:0;width:min(94%,400px);
 margin:5px 0 3px;background:#f9fbff;border:1px solid #8ca8c9;border-radius:8px;overflow:hidden;
 box-shadow:0 9px 28px #03091960;transform:perspective(700px) rotateX(2deg)}
.tf-media-browser-bar{display:flex;align-items:center;gap:7px;height:24px;min-height:24px;background:#e5edfa;padding:0 8px;color:#52637c;border-bottom:1px solid #ced8ea}
.tf-media-browser-dots{display:flex;align-items:center;gap:3px;flex:none}
.tf-media-browser-dots i{width:5px;height:5px;background:#ff9288;border-radius:50%}
.tf-media-browser-dots i:nth-child(2){background:#ffd173}
.tf-media-browser-dots i:nth-child(3){background:#82d9ab}
.tf-media-browser-address{display:flex;align-items:center;justify-content:center;gap:5px;min-width:0;flex:1;color:#586b86;background:#fff;border-radius:4px;height:17px;font-size:9px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.tf-media-browser-address svg{flex:none}
.tf-media-browser-body{display:flex;flex:1;min-height:76px;overflow:hidden}
.tf-media-browser-sidebar{background:#e7ecf5;width:22%;padding:13px 7px;display:grid;align-content:start;gap:8px}
.tf-media-browser-sidebar span{height:5px;width:85%;background:#bbc8dd;border-radius:5px}
.tf-media-browser-sidebar span:first-child{height:11px;width:11px;background:#6389c9;border-radius:4px;margin-bottom:8px}
.tf-media-browser-sidebar span:last-child{width:60%}
.tf-media-browser-content{padding:13px 13px 8px;flex:1;min-width:0}
.tf-media-browser-pill{height:6px;width:46px;border-radius:9px;background:#b6ccf7;display:block;margin-bottom:10px}
.tf-media-browser-heading{font:800 clamp(12px,1.4vw,18px)/1.22 'Plus Jakarta Sans',system-ui,sans-serif;
 color:#1c3150;letter-spacing:-.04em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.tf-media-browser-rule{display:block;margin-top:9px;width:86%;height:5px;background:#ccd8eb;border-radius:10px}
.tf-media-browser-rule.short{width:58%;margin-top:6px}
.tf-media-browser-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:12px}
.tf-media-browser-tiles i{height:21px;border-radius:5px;background:linear-gradient(145deg,#9fc1f4,#d9e5ff)}
.tf-media-browser-tiles i:nth-child(2){background:linear-gradient(145deg,#d5c8f8,#eee7ff)}
.tf-media-browser-tiles i:nth-child(3){background:linear-gradient(145deg,#a9dbd5,#daf3ee)}
.tf-media-poster-footer{position:relative;width:100%;min-width:0;display:flex;justify-content:space-between;align-items:flex-end;gap:8px}
.tf-media-poster-footer>div{display:grid;gap:3px;min-width:0}
.tf-media-type{display:inline-flex;align-items:center;gap:5px;color:#c5d5f5;font-size:8px;font-weight:800;letter-spacing:.09em}
.tf-media-poster-footer strong{font-size:11px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:145px}
.tf-project-media-poster .tf-project-media-open{
 position:static;display:inline-flex;align-items:center;justify-content:center;gap:5px;
 padding:8px 10px;flex:none;max-width:50%;white-space:nowrap;background:#f5f8ff;color:#1a3357!important;
 border:0;border-radius:7px;box-shadow:none;font-size:10px;letter-spacing:0;text-transform:none;
}
.tf-project-media-poster .tf-project-media-open:hover{background:#cfe1ff}
.tf-project-media.tf-project-media-placeholder{display:flex;flex-direction:column;justify-content:center;align-items:center;
 padding:12px 18px;gap:8px;text-align:center;background:linear-gradient(145deg,#24334a,#0d1c30);color:#dce9ff}
.tf-media-placeholder-icon{width:52px;height:52px;border:1px solid #5b7599;border-radius:14px;display:grid;place-items:center;color:#a6c3ed}
.tf-project-media-placeholder strong{font-size:12px}
.tf-project-media-placeholder span{max-width:245px;font-size:10px;line-height:1.5;color:#aebfda}
.tf-project-media-images .tf-media-visit{bottom:10px;right:10px;border:1px solid #ffffff6b;border-radius:8px;box-shadow:0 2px 11px #0005}
.tf-project-media-images .pg-public-cover .pg-photo-button{height:100%;width:100%}
@media(max-width:740px){
 .tf-media-browser-content{padding:9px}
 .tf-media-browser-tiles{margin-top:7px}
 .tf-media-browser-rule{margin-top:6px}
 .tf-project-media-poster .tf-project-media-open{padding:7px 8px;font-size:9px}
}


/* Optional encrypted Gemini key vault */
.tf-gemini-vault{border:1px solid #bad2f3;background:linear-gradient(145deg,#f6faff,#edf5ff);border-radius:15px;padding:20px;margin:20px 0 25px}
.tf-gemini-vault-title{display:flex;align-items:flex-start;gap:12px;color:#426ad3}
.tf-gemini-vault-title>svg{flex:none;margin-top:4px}
.tf-gemini-vault-title h4{font:800 14px 'Plus Jakarta Sans',system-ui;margin:0 0 6px;color:#243e60}
.tf-gemini-vault-title p{font-size:11px;color:#647b9c;line-height:1.65;margin:0}
.tf-gemini-vault-note{font-size:11px;color:#677b95;line-height:1.8;margin:14px 0}
.tf-gemini-vault-input{display:grid;gap:7px;font-size:11px;font-weight:800;color:#425d81}
.tf-gemini-vault-input input{padding:12px 14px;border:1px solid #cbd9ef;background:#fff;color:#283e60;border-radius:9px;font-size:12px;max-width:550px;width:100%}
.tf-gemini-vault-input input:focus-visible{outline:3px solid #b9cbff;outline-offset:2px}
.tf-gemini-vault-actions{display:flex;flex-wrap:wrap;gap:9px;align-items:center;margin-top:15px}
.tf-gemini-vault-message{padding:10px 13px;border:1px solid #d5e4f6;background:#fff;border-radius:9px;color:#3b587e;font-size:11px;line-height:1.65;margin-top:14px}
html.tf-dark .tf-gemini-vault{background:linear-gradient(150deg,#1c304e,#203a5b);border-color:#47618c}
html.tf-dark .tf-gemini-vault-title h4{color:#eef5ff}
html.tf-dark .tf-gemini-vault-title p,html.tf-dark .tf-gemini-vault-note,html.tf-dark .tf-gemini-vault-input{color:#c3d5f1}
html.tf-dark .tf-gemini-vault-input input{background:#15263f;color:#f4f7ff;border-color:#516b8f}
html.tf-dark .tf-gemini-vault-message{background:#203657;color:#e1edff;border-color:#536d92}


/* Premium Talentfolio AI career analysis report studio v5 */
.tf-report-root{margin:28px 0 16px;min-width:0}
.tf-report-toolbar{background:#f5f8fe;border:1px solid #d9e3f2;border-radius:16px 16px 0 0;padding:21px 22px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}
.tf-report-toolbar>div:first-child>span{display:inline-flex;align-items:center;gap:7px;font-size:9px;letter-spacing:1.3px;font-weight:900;color:#4b6de4}
.tf-report-toolbar h3{color:#18314f;font:800 clamp(18px,2.3vw,24px)/1.2 'Plus Jakarta Sans',system-ui;margin:7px 0}
.tf-report-toolbar p{margin:0;color:#6b7c91;font-size:11px}
.tf-report-export{display:flex;flex-wrap:wrap;gap:8px}
.tf-report-export button{min-height:41px;border:1px solid #d1ddf0;background:#fff;color:#334c70;padding:10px 13px;font-weight:800;font-size:11px;border-radius:9px;display:inline-flex;gap:7px;align-items:center;justify-content:center}
.tf-report-export .tf-report-export-primary{background:#365ee1;border-color:#365ee1;color:#fff;box-shadow:0 7px 12px #3455b52e}
.tf-report-export button:disabled{opacity:.5}
.tf-career-report{--cr-accent:#4b6ee5;--cr-line:#dbe4f2;--cr-ink:#18304e;--cr-muted:#667992;--cr-background:#fff;background:#fff;color:#1c3352;overflow:hidden;box-shadow:0 16px 38px #132b5512;border:1px solid #d8e3f2;border-top:0;max-width:1120px;margin:auto;font-family:'DM Sans',system-ui,sans-serif}
.tf-report-cover{position:relative;padding:26px clamp(22px,4vw,54px) 0;color:#fff;overflow:hidden;background:radial-gradient(ellipse at 78% 25%,#3d5d9d88 0%,transparent 55%),linear-gradient(130deg,#0c172d 0%,#172e53 58%,#243a66 100%);min-height:340px}
.tf-report-cover:after{content:'';position:absolute;right:-80px;top:70px;width:330px;height:330px;border:1px solid #8eaaff24;border-radius:50%;box-shadow:0 0 0 48px #ffffff05,0 0 0 95px #ffffff04;pointer-events:none}
.tf-report-cover-top{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px}
.tf-report-brand{font:800 11px 'Plus Jakarta Sans',system-ui;letter-spacing:1.3px;display:flex;align-items:center;gap:7px}
.tf-report-brand b{color:#9bbdff}.tf-report-brand-mark{width:29px;height:29px;border-radius:8px;display:grid;place-items:center;color:#fff;background:#5a76f8}
.tf-report-cover-edition{font-weight:700;color:#9cb5dc;font-size:9px;letter-spacing:1.1px}
.tf-report-cover-body{position:relative;z-index:1;margin:38px 0 28px;max-width:650px}
.tf-report-eyebrow{font-size:9px;letter-spacing:2px;color:#96b6ff;font-weight:900}
.tf-report-cover-body h2{font:900 clamp(28px,4.5vw,53px)/1.04 'Plus Jakarta Sans',system-ui;letter-spacing:-1.8px;margin:13px 0}
.tf-report-cover-body h2 em{font-style:normal;color:#8eb1ff}
.tf-report-cover-line{height:3px;width:62px;border-radius:5px;background:#789dff;margin:20px 0}
.tf-report-cover-body p{font-size:11px;line-height:1.8;color:#c5d3ee;max-width:510px}
.tf-report-cover-meta{position:relative;z-index:1;display:grid;grid-template-columns:1.1fr .9fr 1fr;border-top:1px solid #ffffff2b}
.tf-report-cover-meta>div{padding:17px 16px 20px 0;display:grid;gap:6px}
.tf-report-cover-meta span{color:#a5badd;font-size:8px;font-weight:800;letter-spacing:1.3px}
.tf-report-cover-meta strong{font-size:12px;font-weight:800;overflow-wrap:anywhere}
.tf-report-paper{padding:30px clamp(20px,4vw,51px) 22px;background:#fff}
.tf-report-paper-kicker{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#8190a8;font-size:9px;letter-spacing:1px;font-weight:800;border-bottom:1px solid #e3eaf3;padding-bottom:16px}
.tf-report-lead{background:linear-gradient(120deg,#f0f5ff,#fafcff);border:1px solid #dae4f8;border-left:4px solid #5376f2;border-radius:11px;margin:24px 0 22px;display:flex;align-items:flex-start;gap:15px;padding:22px}
.tf-report-lead-icon{flex:none;background:#dae6ff;color:#426ad5;border-radius:11px;width:43px;height:43px;display:grid;place-items:center}
.tf-report-lead h3{font:800 17px 'Plus Jakarta Sans',system-ui;color:#193456;margin:0 0 8px}
.tf-report-lead p{font-size:12px;line-height:1.85;color:#4c6180;margin:0 0 10px;white-space:pre-line}
.tf-report-summary-stripe{display:grid;grid-template-columns:1.2fr .8fr 1fr;gap:12px;padding:17px 20px;border:1px solid #e2e9f5;border-radius:12px;background:#fbfcff;margin-bottom:22px}
.tf-report-summary-stripe>div{display:grid;gap:5px}
.tf-report-summary-stripe span{color:#8192ab;font-size:9px;font-weight:800;letter-spacing:.8px}
.tf-report-summary-stripe strong{color:#274467;font-size:12px;overflow-wrap:anywhere}
.tf-report-section{margin:21px 0 24px;border:1px solid #dfe7f2;border-radius:13px;padding:25px;break-inside:avoid-page;background:#fff;box-shadow:0 5px 14px #18365d07}
.tf-report-section-head{display:flex;align-items:flex-start;gap:13px;padding-bottom:15px;border-bottom:1px solid #e4ebf5;margin-bottom:15px}
.tf-report-section-icon{background:#eaf0ff;color:#456ddb;border-radius:11px;width:42px;height:42px;display:grid;place-items:center;flex:none}
.tf-report-section-head>div:last-child{min-width:0}
.tf-report-section-head span{color:#5272b9;font-size:9px;font-weight:900;letter-spacing:1px}
.tf-report-section-head h3{font:800 clamp(16px,2.3vw,21px)/1.24 'Plus Jakarta Sans',system-ui;color:#172f51;margin:6px 0 0;overflow-wrap:anywhere}
.tf-report-section-strength .tf-report-section-icon{background:#e5f7f1;color:#258d74}
.tf-report-section-gap .tf-report-section-icon{background:#fff2e5;color:#cf8634}
.tf-report-section-roadmap .tf-report-section-icon{background:#eeeaff;color:#735bd8}
.tf-report-section-project .tf-report-section-icon{background:#e5f1fd;color:#2c7fba}
.tf-report-section-question .tf-report-section-icon{background:#fff5de;color:#a97b23}
.tf-report-prose p{font-size:12px;color:#405876;line-height:1.9;white-space:pre-line;margin:8px 0 13px}
.tf-report-list{display:grid;gap:10px;padding:0;margin:0;list-style:none}
.tf-report-bullet{position:relative;padding:13px 14px 13px 34px;background:#f7f9fd;border:1px solid #ebeff6;border-radius:9px;color:#425873;line-height:1.85;font-size:12px;break-inside:avoid-page}
.tf-report-bullet:before{content:'';position:absolute;left:14px;top:21px;width:8px;height:8px;background:#6e8ef1;border-radius:3px}
.tf-report-bullet strong{color:#19375f}
.tf-report-prose strong{color:#1d3659}
.tf-report-subhead{font-size:13px;color:#254876;font-weight:800;margin:13px 0 7px}
.tf-report-quote{border-left:3px solid #8ca7e8;padding:9px 16px;margin:12px 0;color:#547299;font-style:italic;background:#f5f8ff}
.tf-report-footer{margin-top:26px;border-top:1px solid #dce6f4;padding:20px 0 7px}
.tf-report-footer>div{display:flex;align-items:flex-start;gap:11px;color:#61718d}
.tf-report-footer svg{color:#5076dd;flex:none}
.tf-report-footer p{font-size:10px;line-height:1.8;margin:0}
.tf-report-footer>span{display:block;margin-top:15px;font-size:9px;color:#8494aa;text-align:right}
.tf-report-footnote{display:flex;align-items:center;gap:7px;font-size:11px;color:#6c7e9b;line-height:1.75;margin:13px 3px}
.tf-report-footnote svg{flex:none}
html.tf-dark .tf-report-toolbar{background:#203250;border-color:#3c5276}
html.tf-dark .tf-report-toolbar h3{color:#edf3ff}
html.tf-dark .tf-report-toolbar p{color:#b9c9df}
html.tf-dark .tf-report-export-secondary{background:#2c405f;border-color:#455c7c;color:#f3f7ff}
html.tf-dark .tf-report-footnote{color:#c0d0e8}
@media(max-width:780px){
 .tf-report-toolbar{padding:16px}
 .tf-report-cover{padding:23px 21px 0}
 .tf-report-cover-edition{display:none}
 .tf-report-cover-body{margin:26px 0}
 .tf-report-cover-body h2{letter-spacing:-1px}
 .tf-report-cover-meta{grid-template-columns:1fr 1fr;gap:2px}
 .tf-report-cover-meta>div{padding:12px 8px 12px 0}
 .tf-report-paper{padding:20px 15px}
 .tf-report-lead{padding:15px}
 .tf-report-section{padding:16px}
 .tf-report-summary-stripe{grid-template-columns:1fr 1fr}
 .tf-report-export{width:100%}
 .tf-report-export button{flex:1}
}
@media print{
 @page{size:A4;margin:12mm}
 body.tf-career-print-active{background:#fff!important}
 body.tf-career-print-active *{visibility:hidden!important}
 body.tf-career-print-active .tf-career-report,
 body.tf-career-print-active .tf-career-report *{visibility:visible!important}
 body.tf-career-print-active .tf-career-report{
  position:absolute!important;left:0!important;top:0!important;width:100%!important;
  max-width:100%!important;border:0!important;box-shadow:none!important;overflow:visible!important;
  margin:0!important;background:#fff!important;color:#1d3655!important
 }
 body.tf-career-print-active .tf-report-cover{min-height:0!important;padding:21mm 15mm 0!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
 body.tf-career-print-active .tf-report-paper{padding:7mm 5mm 0!important}
 body.tf-career-print-active .tf-report-section{box-shadow:none!important;break-inside:auto!important;page-break-inside:auto!important}
 body.tf-career-print-active .tf-report-section-head{break-after:avoid!important}
 body.tf-career-print-active .tf-report-bullet{break-inside:avoid!important}
 body.tf-career-print-active .tf-report-cover,
 body.tf-career-print-active .tf-report-section-icon,
 body.tf-career-print-active .tf-report-bullet,
 body.tf-career-print-active .tf-report-summary-stripe,
 body.tf-career-print-active .tf-report-lead{print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
}


/* Talentfolio AI — TVETMARA Besut / DFK Incubator project-support branding */
.tf-support-banner{max-width:1180px;margin:32px auto 23px;padding:25px 29px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);align-items:center;gap:24px;background:linear-gradient(115deg,#f7f8ff 5%,#fff 65%);border:1px solid #e0e5fa;border-radius:22px;box-shadow:0 16px 34px #122d6220;position:relative}
.tf-support-banner:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,#536efa,#9668ff,#57a5ea);border-radius:22px 22px 0 0}
.tf-support-copy{min-width:0}.tf-support-eyebrow{display:inline-flex;gap:8px;align-items:center;font-size:10px;font-weight:900;letter-spacing:1px;color:#5767c7}
.tf-support-copy h2{color:#203451;font:800 clamp(17px,2vw,23px)/1.35 'Plus Jakarta Sans',sans-serif;margin:10px 0}
.tf-support-copy p{font-size:12px;color:#5e6c89;line-height:1.8;margin:0}
.tf-support-logos{display:flex;align-items:center;justify-content:center;gap:15px;min-width:0;background:#fff;border:1px solid #e6e9f3;border-radius:15px;padding:13px 16px;box-shadow:0 4px 18px #21366b0c}
.tf-support-logo{display:flex;align-items:center;justify-content:center;min-width:0;min-height:64px}
.tf-support-logo-tvet{flex:1.35}.tf-support-logo-dfk{flex:1}
.tf-support-logo img{display:block;width:100%;height:auto;max-height:81px;object-fit:contain}
.tf-support-logo-tvet img{max-width:255px}.tf-support-logo-dfk img{max-width:155px}
.tf-support-logo-divider{display:block;flex:0 0 1px;width:1px;height:53px;background:#d7ddeb}
.tf-support-logos-compact{gap:9px;padding:9px}
.tf-support-logos-compact .tf-support-logo{min-height:42px}
.tf-support-logos-compact .tf-support-logo-tvet img{max-width:160px}
.tf-support-logos-compact .tf-support-logo-dfk img{max-width:100px}
.tf-support-logos-compact .tf-support-logo-divider{height:38px}
.tf-landing-footer{max-width:1180px;margin:35px auto 0;padding:28px 32px 34px;display:grid;grid-template-columns:1fr 1fr;gap:36px;background:#101c33;color:#f4f6ff;border-radius:18px 18px 0 0}
.tf-landing-footer-brand{display:grid;align-content:start;gap:8px}.tf-landing-footer-brand strong{font:800 22px 'Plus Jakarta Sans',sans-serif}
.tf-landing-footer-brand span{color:#aabce1;font-size:11px}.tf-landing-footer-brand p{max-width:370px;color:#c5d0e6;font-size:12px;line-height:1.7;margin:8px 0}
.tf-landing-footer-brand small{color:#93a5c5;font-size:10px}
.tf-support-footer-logos{display:grid;align-content:start;gap:10px;max-width:430px}
.tf-support-footer-logos>span{color:#b9c7ea;font-size:10px;font-weight:900;letter-spacing:1.5px}
.tf-support-footer-logos>small{font-size:10px;color:#c6d3ec;line-height:1.7}
.tf-support-dashboard{padding:13px 11px;border:1px solid #5160a36b;border-radius:12px;background:linear-gradient(145deg,#273151,#1b2948);margin:14px 10px 20px;text-align:center}
.tf-support-dashboard-title{display:flex;align-items:center;justify-content:center;gap:6px;font-size:8px;font-weight:900;color:#dbe5ff;letter-spacing:.7px}
.tf-support-dashboard .tf-support-logos{margin:9px 0 7px}
.tf-support-dashboard p{font-size:9px;color:#c0cee9;line-height:1.6;margin:0}
.tf-report-support{margin:9px 0 17px;padding:13px 16px;background:#fff;color:#274166;border-radius:13px;border:1px solid #d7e3fb}
.tf-report-support-label{display:flex;align-items:center;justify-content:center;gap:7px;color:#5569b7;font-size:9px;font-weight:900;letter-spacing:.7px}
.tf-report-support .tf-support-logos{border:0;box-shadow:none;margin:7px auto;padding:3px 9px;max-width:465px}
.tf-report-support p{text-align:center;margin:5px 0 0;color:#5b6b85;font-size:10px;line-height:1.5}
html.tf-dark .tf-support-banner{background:linear-gradient(115deg,#182844,#23365d);border-color:#405782}
html.tf-dark .tf-support-copy h2{color:#f0f5ff}
html.tf-dark .tf-support-copy p{color:#c4d3ee}
html.tf-dark .tf-support-eyebrow{color:#b9c9ff}
@media(max-width:760px){.tf-support-banner{margin:20px 15px;padding:22px 17px;grid-template-columns:1fr;gap:15px}.tf-support-logos{gap:8px;padding:11px}.tf-support-logo-tvet img{max-width:200px}.tf-support-logo-dfk img{max-width:115px}.tf-landing-footer{margin:20px 15px 0;padding:23px;grid-template-columns:1fr;gap:22px}.tf-report-support{padding:10px 9px}.tf-report-support .tf-support-logos{padding:6px}}
@media print{.tf-report-support{break-inside:avoid!important;page-break-inside:avoid!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}}


/* 2026-11 — Premium login + dashboard partner placements */
.tf-sidebar{overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#445e82 transparent}
.tf-auth-bottom{display:grid;align-content:end;gap:17px;position:relative;z-index:1;width:100%;max-width:480px;margin-top:22px}
.tf-auth-bottom>small{font-size:10px;color:#afc1df;letter-spacing:.15px}
.tf-support-auth{padding:18px;border:1px solid #829af15c;border-radius:16px;background:linear-gradient(145deg,#eaf1ff17,#a6beff0b);box-shadow:0 15px 40px #07192b34;backdrop-filter:blur(8px)}
.tf-support-auth-header{display:flex;align-items:center;gap:8px;color:#d0dcff;font:800 9px 'Plus Jakarta Sans',system-ui,sans-serif;letter-spacing:1.3px;margin-bottom:11px}
.tf-support-auth-header svg{color:#a9b9ff;flex:none}
.tf-support-auth .tf-support-logos{max-width:420px;margin:0;background:#fff;border-radius:12px;padding:11px 17px;box-shadow:0 6px 18px #080e2a1b}
.tf-support-auth .tf-support-logos .tf-support-logo{min-height:48px}
.tf-support-auth .tf-support-logo-tvet img{max-width:186px;max-height:53px}
.tf-support-auth .tf-support-logo-dfk img{max-width:115px;max-height:71px}
.tf-auth-left .tf-support-auth p{font-size:11px;line-height:1.6;color:#d3def6;margin:12px 0 0;max-width:420px}
.tf-support-auth-mobile{display:none}
.tf-support-dashboard-main{position:relative;overflow:hidden;isolation:isolate;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:center;gap:24px;padding:22px 27px;margin:0 0 20px;border-radius:17px;background:linear-gradient(112deg,#fafbff 0%,#eef2ff 58%,#e7edff 100%);border:1px solid #dce4fa;box-shadow:0 8px 25px #192b6111}
.tf-support-dashboard-main:before{content:"";position:absolute;right:-85px;top:-130px;width:340px;height:340px;border:1px solid #91aaff57;border-radius:50%;box-shadow:0 0 0 30px #6e90ec12,0 0 0 63px #5e86d009;z-index:-1;pointer-events:none}
.tf-support-dashboard-main-copy{min-width:0;position:relative;z-index:1}
.tf-support-dashboard-main-tag{display:inline-flex;align-items:center;gap:7px;border:1px solid #d0d9fc;color:#465eb0;background:#ffffffa8;border-radius:999px;padding:7px 11px;font-size:9px;font-weight:900;letter-spacing:1px}
.tf-support-dashboard-main h2{font:800 clamp(17px,2vw,23px)/1.34 'Plus Jakarta Sans',system-ui,sans-serif;color:#18345d;letter-spacing:-.6px;margin:12px 0 6px}
.tf-support-dashboard-main p{color:#58708f;font-size:12px;line-height:1.75;margin:0;max-width:515px}
.tf-support-dashboard-main .tf-support-logos{width:100%;max-width:420px;justify-self:end;background:#fff;box-shadow:0 6px 22px #182d6016;border-color:#dfe6f2;border-radius:13px;padding:12px}
.tf-support-dashboard-main .tf-support-logo-tvet img{max-width:195px;max-height:65px}
.tf-support-dashboard-main .tf-support-logo-dfk img{max-width:118px;max-height:70px}
html.tf-dark .tf-support-dashboard-main{background:linear-gradient(115deg,#1a2b49,#273f6a 80%,#243758);border-color:#40577b;box-shadow:0 8px 23px #070e2380}
html.tf-dark .tf-support-dashboard-main h2{color:#f0f5ff}
html.tf-dark .tf-support-dashboard-main p{color:#c9d8ee}
html.tf-dark .tf-support-dashboard-main-tag{background:#243b60;border-color:#52709d;color:#d3e1ff}
html.tf-dark .tf-support-dashboard-main .tf-support-logos{background:#fff}
html.tf-dark .tf-auth-bottom>small{color:#b6c9e5}
@media(max-height:850px) and (min-width:841px){
 .tf-auth-left{padding-top:25px;padding-bottom:23px}
 .tf-auth-left h1{font-size:clamp(34px,3.6vw,51px);margin:17px 0}
 .tf-auth-left .tf-auth-points{gap:9px;margin-top:19px}
 .tf-support-auth{padding:13px 16px}
 .tf-support-auth .tf-support-logos{padding:8px 13px}
 .tf-auth-bottom{margin-top:13px;gap:8px}
}
@media(max-width:1000px) and (min-width:841px){
 .tf-auth-left{padding-left:26px;padding-right:26px}
 .tf-auth-left h1{font-size:clamp(32px,4vw,48px)}
 .tf-support-dashboard-main{grid-template-columns:1fr .8fr;gap:14px;padding:18px}
}
@media(max-width:840px){
 .tf-support-auth-mobile{display:block;border:1px solid #dce5f8;background:linear-gradient(130deg,#fafcff,#eff4ff);padding:15px;border-radius:14px;margin:27px 0 5px;box-shadow:0 7px 22px #2339690b}
 .tf-support-auth-mobile>span{display:flex;align-items:center;gap:7px;font-size:9px;color:#536bb4;font-weight:900;letter-spacing:.7px;margin-bottom:12px}
 .tf-support-auth-mobile .tf-support-logos{border-radius:11px;border-color:#e2e9f6;box-shadow:none}
 .tf-support-auth-mobile p{font-size:10px;color:#7283a0;text-align:center;margin:12px 0 0}
 html.tf-dark .tf-support-auth-mobile{background:#203452;border-color:#496085}
 html.tf-dark .tf-support-auth-mobile>span{color:#c7d8ff}
 html.tf-dark .tf-support-auth-mobile p{color:#c4d3ea}
}
@media(max-width:720px){
 .tf-support-dashboard-main{grid-template-columns:1fr;padding:19px 17px;gap:14px;margin-bottom:16px}
 .tf-support-dashboard-main .tf-support-logos{justify-self:stretch;max-width:none}
 .tf-support-dashboard-main h2{font-size:19px}
 .tf-support-dashboard-main p{font-size:11px}
 .tf-support-dashboard-main .tf-support-logo-tvet img{max-width:190px}
 .tf-support-dashboard-main .tf-support-logo-dfk img{max-width:111px}
}
@media(max-width:400px){
 .tf-support-auth-mobile{padding:11px}
 .tf-support-logos-compact{padding:7px;gap:6px}
 .tf-support-logos-compact .tf-support-logo-divider{height:31px}
 .tf-support-dashboard-main .tf-support-logos{gap:6px;padding:9px}
}


/* Security settings — data portability and destructive action controls */
.tf-account-danger{border:1px solid #e5b9be;background:linear-gradient(160deg,#fff,#fff8f8)}
.tf-account-danger .tf-settings-icon{background:#fde7e9;color:#ab3540}
.tf-account-danger .tf-settings-section-head h2{color:#912d39}
.tf-account-danger .tf-btn-outline{border-color:#d58d96;color:#9e3040;background:#fff}
.tf-account-danger .tf-btn-outline:hover:not(:disabled){background:#fff0f1}
.tf-account-danger .tf-btn-outline:disabled{opacity:.5;cursor:not-allowed}
.tf-account-danger .tf-hint{color:#855260;line-height:1.7}
html.tf-dark .tf-account-danger{background:#302531;border-color:#8d4f60}
html.tf-dark .tf-account-danger .tf-settings-section-head h2{color:#ffb8c0}
html.tf-dark .tf-account-danger .tf-settings-icon{background:#623344;color:#ffd5db}
html.tf-dark .tf-account-danger .tf-btn-outline{background:#39263b;border-color:#af7483;color:#ffb8c4}
html.tf-dark .tf-account-danger .tf-hint{color:#e1b6c0}
@media(max-width:560px){.tf-account-danger{padding:17px}}

```

## 24. docs/PHASE1_SECURITY_SETUP.md

```text
# Talentfolio AI — Fasa 1 Keselamatan (branch security/phase1-hardening)

> **Status:** Kod dan migrasi disediakan pada branch keselamatan. Migrasi **BELUM** digunakan pada production. Tiada service-role key dimasukkan ke GitHub. Jangan gabung ke main sebelum semakan RLS dan ujian staging selesai.

## Perkara yang sudah diaudit

- Stack: Next.js 15 App Router, React 19, Supabase Auth/Postgres/Storage, Vercel.
- Jadual `portfolio_publications` mempunyai polisi `anon SELECT USING (published=true)`, yang membenarkan enumerasi semua portfolio terbit.
- Butang Publish lama membentuk snapshot di browser, kemudian menulis terus ke `portfolio_publications`.
- Project gallery menggunakan dua UPDATE berasingan untuk menetapkan cover.
- Endpoint Gemini tidak mempunyai kuota server-side, dan bergantung pada `content-length` yang boleh dipalsukan.
- Browser session sebelumnya bergantung pada default localStorage Supabase client; laluan dashboard tidak dilindungi middleware berasaskan cookie.
- Rekod sebenar tidak mempunyai skill berganda (case-insensitive), saiz snapshot terbesar 4,570 bait, dan teks profil/projek sedia ada berada dalam had baru; migration boleh disemak tanpa memadam kandungan.
- RLS sedia ada untuk data pemilik dan bucket Certificate Vault kekal.

## Persiapan manual wajib sebelum merge

1. Buka Supabase project `qdehpujevmstqueysoss` dalam akaun ghgroup. Guna projek staging/backup untuk ujian sebelum membuat perubahan database sebenar. Simpan SQL rollback dan backup skema. Migrasi baru: `supabase/migrations/0010_phase1_security.sql`.
2. Setelah menerima kelulusan, gunakan Supabase CLI atau Dashboard SQL Editor untuk migrasi 0010 dalam transaksi. **Jangan** jalankan 0001–0009 semula.
3. Setelah migrasi tersedia, pastikan RPC `get_published_portfolio`, `publish_portfolio`, `set_project_cover`, `consume_api_quota` wujud. `anon` tidak boleh `SELECT` jadual `portfolio_publications` terus.
4. Supabase **Authentication → Providers/Email**: aktifkan e-mel confirmation, semak Site URL `https://talent-portfolio-ai.vercel.app`, tambah redirect `/auth/callback` dan `/auth?mode=recovery`, tetapkan SMTP untuk production. Aktifkan leaked password protection jika tersedia dalam pelan. Aktifkan CAPTCHA jika sesuai. Semak tetapan email template (PKCE).
5. Vercel Settings → Environment Variables: tambah `SUPABASE_SERVICE_ROLE_KEY` **server-only**, tidak memakai prefix `NEXT_PUBLIC_`. Hadkan kepada environment yang perlu sahaja. Pengurus deployment hendaklah memeriksa kebocoran secret dalam logs dan bundle selepas build.
6. Supabase Edge Function secrets: simpan `CLEANUP_JOB_SECRET` (token rawak panjang), `SUPABASE_SERVICE_ROLE_KEY` (dikendalikan oleh Supabase). Deploy `cleanup-orphaned-objects` dengan pengesahan JWT dimatikan **hanya kerana** endpoint memeriksa secret Bearer sendiri, lalu jadualkan panggilan POST melalui Supabase Cron berautentikasi. Jangan gunakan secret itu dalam URL atau commit. Jika Cron tidak tersedia, proses queue secara manual atau tambah penjadual luaran yang selamat.
7. Jika integrasi menggunakan Google AI Studio, semak bahawa model `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.8-flash` benar-benar tersedia bagi API key pengguna. Model endpoint boleh berbeza menurut project/billing; jangan andaikan semua key mempunyai akses.
8. Jalankan build, lint, ujian multi-user dan regression dalam deployment preview. **Deploy production hanya selepas ujian keselamatan lulus.**

## SQL QA — read-only selepas migrasi (jalankan di staging)

```sql
select schemaname,tablename,policyname,cmd,roles,qual
  from pg_policies where tablename='portfolio_publications';

select routine_name, security_type from information_schema.routines
 where routine_schema='public'
   and routine_name in ('get_published_portfolio','publish_portfolio',
                         'set_project_cover','consume_api_quota');

select conname, pg_get_constraintdef(oid) from pg_constraint
 where conrelid in ('public.profiles'::regclass,'public.projects'::regclass,
                    'public.portfolio_publications'::regclass);

select tablename, rowsecurity from pg_tables
 where schemaname='public' and tablename in ('api_usage','storage_cleanup_jobs');

select bucket_id, count(*) from storage.objects
 where bucket_id in ('project-gallery','certificates','profile-photos')
 group by bucket_id;
```

## Manual acceptance tests — security

1. Anonymous Data API `GET /rest/v1/portfolio_publications?select=*` returns denied/empty, even if published data exists.
2. Anonymous RPC `get_published_portfolio("a-published-slug")` returns exactly one published record with slug/template/snapshot and no private email/certificate paths. Missing/unpublished slug returns no rows.
3. User A can update only A's profile and call `publish_portfolio`; cannot inspect User B's `skills`, `certificates`, `projects`, `project_images` or publication. Include Storage signed URLs & direct access tests.
4. Direct REST write with arbitrary `snapshot` never persists caller-supplied data when published; trigger always reconstructs from owner's records.
5. Reserved, duplicate, too short, too long and invalid-character slugs are rejected. Test collision across two accounts and confirm a clear user-friendly message.
6. Attempt 13th gallery image; expect database rejection. Attempt 31st certificate; reject. Test concurrent uploads against the quotas. Profile storage rejects a 6th file; normal avatar replacement (upload then remove old) still works.
7. `set_project_cover` with an image belonging to another account fails. Concurrent requests leave exactly one cover.
8. Delete project and certificate, verify cleanup job queue; run protected cleanup worker once and confirm metadata/file deletion. Unauthorized function call must return 401.
9. Gemini with unconfirmed email returns 403; 6th analysis/hour and 11th connection test/hour return 429 plus `Retry-After`; oversized body, even without Content-Length, returns 413.
10. Gemini vault v1 decrypts using 250000 PBKDF2 and re-saves as v2 (600000). Wrong passphrase fails safely; no raw key is stored.
11. Test SSR login, email confirmation, password recovery, protected direct links and session expiry. Authenticated visitor redirected from login page.
12. Export JSON and delete account with typed matching email. Validate stored files removed first, user records cascaded, no service-role key in browser bundle.
13. Inspect CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy in response headers.
14. Regression: nine portfolio themes, gallery image URLs, certificate private storage, Resume Studio and Gemini report export.

## Known limitations / caveats

- Migrasi tidak boleh dianggap lulus sehingga diuji di database staging. Database production hanya satu projek aktif yang disahkan semasa audit.
- Menggugurkan polisi anon sebelum versi RPC client dideploy boleh menyebabkan portfolio awam sementara tidak boleh dibuka. Jalankan cutover dalam maintenance window.
- User interface Fasa 2–4 (publishing controls, CSS overhaul, Vitest/Playwright, komponen modular) belum dibuat dan jangan dicampur dalam migrasi keselamatan.
- CSP `script-src 'unsafe-inline'` digunakan kerana Next.js 15 mengeluarkan bootstrap scripts inline. Ini masih lebih lemah daripada CSP nonce ketat; pertimbangkan nonce-based rendering selepas ujian pengaruh prestasi.
- URL gambar galeri snapshot kini relative dan ditukarkan kepada URL storage Supabase yang dipercayai dalam `/u/[slug]`.
- Edge cleanup queue memerlukan function, secret dan jadual Cron disediakan secara manual sebelum pembersihan berkala berjalan.
- Fungsi hapus akaun mungkin mengambil masa jika pengguna mempunyai ribuan fail; pemadaman berkelompok dan opsyen job asinkron adalah penambahbaikan seterusnya.
- Projek asal belum memiliki lockfile npm yang disahkan. Sebelum merge, hasilkan `package-lock.json` daripada versi dependency yang dipin dan commit. Jangan menganggap Vercel build menggantikan ujian local npm ci.

## Rollback

Migrasi 0010 mengandungi arahan rollback dalam komen. Elakkan kembali kepada polisi anon SELECT melainkan benar-benar kecemasan, kerana ia membuka semula risiko enumerasi. Untuk rollback aplikasi, kembalikan deployment preview sebelumnya dan pulihkan database kepada backup staging (jangan bergantung pada rollback kod semata-mata selepas skema berubah).

## Keutamaan keselamatan selepas kelulusan Fasa 1

Fasa 2 adalah penerbitan & UX, Fasa 3 UI/prestasi, Fasa 4 refactor/ujian/CI. Jangan mulakan sebelum pemilik projek meluluskan hasil Fasa 1.

```

