import {test,expect} from "@playwright/test";
import {build} from "esbuild";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {NextRequest}=require("next/server");
const fixtureKey="synthetic-key-not-real-001";
const report=["Ringkasan ujian.",...["Tiga Kekuatan Utama","Empat Jurang Kemahiran","Pelan Belajar 30/60/90 Hari","Dua Projek Praktikal","Soalan untuk Melengkapkan Data"].map((title,i)=>"### "+(i+1)+". "+title+"\n"+Array.from({length:[3,4,3,2,2][i]},()=>"- Bukti sintetik dan tindakan praktikal untuk menguji laporan kerjaya yang lengkap, bukan data pengguna sebenar.").join("\n")),"TAMAT_LAPORAN"].join("\n\n");
const stub='export function createClient(){const s=globalThis.__tfApiFixture;return {auth:{getUser:async()=>({data:{user:s.user},error:null})},rpc:async()=>({data:[{allowed:s.allowed,retry_after:60,remaining:4}],error:null}),from(table){return {select(){return this},eq(field,id){s.filters.push([table,field,id]);return this},limit:async()=>({data:table==="skills"?[{name:"SQL",self_rating:3}]:[],error:null})}}}}';
async function loadRoute(entry){
 const result=await build({entryPoints:[entry],bundle:true,write:false,platform:"node",format:"cjs",packages:"external",plugins:[{name:"offline-db",setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:"db",namespace:"stub"}));b.onLoad({filter:/.*/,namespace:"stub"},()=>({contents:stub,loader:"js"}));}}]});
 const mod={exports:{}};
 new Function("require","module","exports",result.outputFiles[0].text)(require,mod,mod.exports);
 return mod.exports.POST;
}
function request(body,token="synthetic-session"){
 return new NextRequest("http://localhost/api/skills/analyze",{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{})},body:JSON.stringify(body)});
}
test("Gemini server routes enforce auth, consent, quota and validated mock output without network",async()=>{
 const analyze=await loadRoute("app/api/skills/analyze/route.ts");
 const connect=await loadRoute("app/api/skills/test-connection/route.ts");
 const originalFetch=globalThis.fetch;
 const s={user:{id:"qa-owner",email_confirmed_at:"2026-01-01"},allowed:true,filters:[],calls:[],responses:[]};
 globalThis.__tfApiFixture=s;
 globalThis.fetch=async(url,options)=>{
  if(!String(url).startsWith("https://generativelanguage.googleapis.com/"))throw Error("Unexpected network destination");
  s.calls.push({url:String(url),options});
  if(!s.responses.length)throw Error("Unexpected provider call");
  return s.responses.shift();
 };
 const body={role:"QA Engineer",consent:true,apiKeys:[fixtureKey,fixtureKey+"-2"]};
 const ok=(text,finishReason="STOP")=>Response.json({candidates:[{finishReason,content:{parts:[{text}]}}]});
 try{
  expect((await analyze(request(body,""))).status).toBe(401);
  s.user.email_confirmed_at=null;
  expect((await analyze(request(body))).status).toBe(403);
  s.user.email_confirmed_at="2026-01-01";
  s.allowed=false;
  const denied=await analyze(request(body));
  expect(denied.status).toBe(429);
  expect(denied.headers.get("retry-after")).toBe("60");
  s.allowed=true;
  expect((await analyze(request({...body,consent:false}))).status).toBe(400);
  expect((await analyze(request(null))).status).toBe(400);
  expect((await analyze(request({...body,model:"arbitrary-model"}))).status).toBe(400);
  expect(s.calls).toHaveLength(0);
  s.responses.push(Response.json({error:{status:"RESOURCE_EXHAUSTED"}},{status:429}),ok(report));
  const result=await analyze(request(body));
  expect(result.status).toBe(200);
  const data=await result.json();
  expect(data.complete).toBe(true);
  expect(data.usedKeySlot).toBe(2);
  expect(data.analysis).not.toContain("TAMAT_LAPORAN");
  expect(JSON.stringify(data)).not.toContain(fixtureKey);
  expect(s.calls).toHaveLength(2);
  expect(s.filters).toHaveLength(5);
  expect(s.filters.every(([,field,id])=>field==="user_id"&&id==="qa-owner")).toBe(true);
  expect(s.calls.every(c=>!c.url.includes(fixtureKey)&&c.options.headers["x-goog-api-key"].startsWith(fixtureKey))).toBe(true);
  s.responses.push(ok("incomplete","MAX_TOKENS"),ok("incomplete","MAX_TOKENS"));
  const incomplete=await analyze(request(body));
  expect(incomplete.status).toBe(502);
  expect(await incomplete.json()).not.toHaveProperty("analysis");
  s.responses.push(Response.json({candidates:[]}));
  expect((await connect(request({apiKey:fixtureKey}))).status).toBe(502);
  s.responses.push(ok("OK"));
  const connection=await connect(request({apiKey:fixtureKey}));
  expect(connection.status).toBe(200);
  expect((await connection.json()).ok).toBe(true);
  expect(s.responses).toHaveLength(0);
 }finally{globalThis.fetch=originalFetch;delete globalThis.__tfApiFixture;}
});

test("Gemini coach enforces auth, consent, shared quota and complete feedback with no profile reads",async()=>{
 const coach=await loadRoute("app/api/career/coach/route.ts");
 const originalFetch=globalThis.fetch;
 const s={user:{id:"qa-owner",email_confirmed_at:"2026-01-01"},allowed:true,filters:[],calls:[],responses:[]};
 globalThis.__tfApiFixture=s;
 globalThis.fetch=async(url,options)=>{
  if(!String(url).startsWith("https://generativelanguage.googleapis.com/"))throw Error("Unexpected network destination");
  s.calls.push({url:String(url),options});
  if(!s.responses.length)throw Error("Unexpected provider call");
  return s.responses.shift();
 };
 const body={mode:"interview",language:"ms",role:"QA Engineer",question:"Describe a test",answer:"Synthetic response",apiKey:fixtureKey,consent:true};
 const feedback={summary:"Synthetic feedback",strengths:["Example"],improvements:["More detail"],nextSteps:["Practice"],followUp:"What changed?"};
 const provider=(value,finishReason="STOP")=>Response.json({candidates:[{finishReason,content:{parts:[{text:"Hidden reasoning",thought:true},{text:JSON.stringify(value)}]}}]});
 try{
  expect((await coach(request(body,""))).status).toBe(401);
  s.user.email_confirmed_at=null;
  expect((await coach(request(body))).status).toBe(403);
  s.user.email_confirmed_at="2026-01-01";
  s.allowed=false;
  expect((await coach(request(body))).status).toBe(429);
  s.allowed=true;
  expect((await coach(request({...body,consent:false}))).status).toBe(400);
  expect((await coach(request({...body,model:"bad-model"}))).status).toBe(400);
  expect((await coach(request({...body,answer:""}))).status).toBe(400);
  expect(s.calls).toHaveLength(0);
  s.responses.push(provider(feedback));
  const valid=await coach(request(body));
  expect(valid.status).toBe(200);
  const result=await valid.json();
  expect(result.feedback).toEqual(feedback);
  expect(JSON.stringify(result)).not.toContain(fixtureKey);
  expect(s.filters).toHaveLength(0);
  expect(s.calls[0].options.headers["x-goog-api-key"]).toBe(fixtureKey);
  expect(s.calls[0].url).not.toContain(fixtureKey);
  expect(s.calls[0].options.body).not.toContain(fixtureKey);
  expect(s.calls[0].options.body).toContain("Synthetic response");
  s.responses.push(provider(feedback,"MAX_TOKENS"),provider({...feedback,nextSteps:[]}));
  expect((await coach(request(body))).status).toBe(502);
  expect((await coach(request(body))).status).toBe(502);
  s.responses.push(Response.json({error:{message:"provider secret details "+fixtureKey}},{status:429}));
  const limited=await coach(request({...body,mode:"career",answer:""}));
  expect(limited.status).toBe(429);
  expect(await limited.text()).not.toContain(fixtureKey);
  expect(s.responses).toHaveLength(0);
 }finally{globalThis.fetch=originalFetch;delete globalThis.__tfApiFixture;}
});
