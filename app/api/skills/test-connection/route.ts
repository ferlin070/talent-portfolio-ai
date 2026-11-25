import { authorizeGeminiRequest, readJsonBody, geminiError } from "@/lib/gemini-api-security";
import { DEFAULT_GEMINI_MODEL, isGeminiModel } from "@/lib/gemini-models";
import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
const respond=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:NextRequest){
 const authorized=await authorizeGeminiRequest(req,"connection_test");
 if(authorized instanceof NextResponse)return authorized;

 let input:{apiKey?:string;model?:string};
 try{
   input=await readJsonBody<{apiKey?:string;model?:string}>(req);
 }catch(error){
   const message=error instanceof Error?error.message:"Input tidak sah.";
   return geminiError(message,message.includes("16 KB")?413:400);
 }
 const key=typeof input.apiKey==="string"?input.apiKey.trim():"";
 const model=input.model??DEFAULT_GEMINI_MODEL;
 if(key.length<15||key.length>250||/\s/.test(key)||!isGeminiModel(model)){
   return respond({error:"Semak API key dan model Gemini."},400);
 }
 const controller=new AbortController(),started=Date.now(),timer=setTimeout(()=>controller.abort(),18000);
 try{
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
   method:"POST",signal:controller.signal,cache:"no-store",
   headers:{"content-type":"application/json","x-goog-api-key":key},
   body:JSON.stringify({contents:[{parts:[{text:"Balas dengan perkataan OK sahaja."}]}],generationConfig:{maxOutputTokens:64,temperature:0}})
  });
  const seconds=Math.round((Date.now()-started)/1000);
  if(res.ok)return respond({ok:true,seconds,model,message:"Sambungan berjaya. Key dan model dapat menjana respons ujian ringkas."});
  return respond({ok:false,httpStatus:res.status,seconds,
   error:res.status===429?"Kuota model telah dicapai (429).":
   res.status===503?"Gemini terlalu sibuk (503).":
   res.status===404?"Model tidak tersedia untuk key ini (404).":
   [400,401,403].includes(res.status)?"Key atau kebenaran model bermasalah (HTTP "+res.status+").":
   "Google Gemini memberi HTTP "+res.status+"."},res.status>=500?502:400);
 }catch(e){return respond({ok:false,error:e instanceof Error&&e.name==="AbortError"?"Ujian ringkas tamat masa selepas 18 saat; Google mungkin sedang perlahan.":"Tidak dapat menghubungi pelayan Gemini.",seconds:Math.round((Date.now()-started)/1000)},504)}
 finally{clearTimeout(timer)}
}
