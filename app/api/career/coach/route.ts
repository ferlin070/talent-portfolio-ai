import {NextRequest,NextResponse} from "next/server";
import {authorizeGeminiRequest,readJsonBody,geminiError} from "@/lib/gemini-api-security";
import {isGeminiModel,DEFAULT_GEMINI_MODEL} from "@/lib/gemini-models";
import {isAllowedRequestOrigin} from "@/lib/request-origin";
import {validateCoachInput,buildCoachPrompt,parseCoachFeedback} from "@/lib/career-coach";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
type ProviderResponse={candidates?:{finishReason?:string;content?:{parts?:{text?:string;thought?:boolean}[]}}[]};
export async function POST(request:NextRequest){
 if(!isAllowedRequestOrigin(request.headers.get("origin"),request.url))return geminiError("Asal permintaan tidak dibenarkan.",403);
 // Reuse the existing per-user analysis budget; no new database or quota bypass.
 const auth=await authorizeGeminiRequest(request,"analysis");
 if(auth instanceof NextResponse)return auth;
 let body:Record<string,unknown>;
 try{body=await readJsonBody<Record<string,unknown>>(request)}catch(e){
  const message=e instanceof Error?e.message:"Input tidak sah.";
  return geminiError(message,message.includes("16 KB")?413:400);
 }
 if(body.consent!==true)return geminiError("Persetujuan khusus coaching diperlukan.",400);
 const model=body.model??DEFAULT_GEMINI_MODEL;
 if(!isGeminiModel(model))return geminiError("Model Gemini tidak disokong.",400);
 const key=body.apiKey;
 if(typeof key!=="string"||key.length<15||key.length>250||/\s/.test(key))return geminiError("API key Gemini tidak sah.",400);
 let input;
 try{input=validateCoachInput(body)}catch(e){return geminiError(e instanceof Error?e.message:"Input tidak sah.",400)}
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),45000);
 try{
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
   method:"POST",cache:"no-store",signal:controller.signal,
   headers:{"content-type":"application/json","x-goog-api-key":key},
   body:JSON.stringify({contents:[{role:"user",parts:[{text:buildCoachPrompt(input)}]}],generationConfig:{temperature:.25,maxOutputTokens:4096,responseMimeType:"application/json",thinkingConfig:{thinkingLevel:"LOW"}}})
  });
  if(!response.ok){
   if(response.status===429)return geminiError("Kuota Gemini telah dicapai. Semak had projek Google AI Studio.",429);
   if(response.status===404)return geminiError("Model Gemini tidak tersedia untuk key ini.",502);
   if([400,401,402,403].includes(response.status))return geminiError("Semak konfigurasi API key, model dan pelan Google AI Studio.",502);
   return geminiError("Gemini tidak tersedia buat masa ini.",502);
  }
  const data:ProviderResponse=await response.json();
  const candidate=data.candidates?.[0];
  const text=(candidate?.content?.parts??[]).filter(p=>!p.thought&&typeof p.text==="string").map(p=>p.text).join("").trim();
  const feedback=parseCoachFeedback(text,candidate?.finishReason);
  if(!feedback)return geminiError("Maklum balas Gemini tidak lengkap atau format tidak sah. Cuba semula.",502);
  return NextResponse.json({feedback,model},{headers:{"Cache-Control":"no-store, max-age=0",Pragma:"no-cache"}});
 }catch(e){return geminiError(e instanceof Error&&e.name==="AbortError"?"Gemini melebihi had masa. Cuba semula kemudian.":"Tidak dapat memperoleh maklum balas Gemini.",502)}
 finally{clearTimeout(timeout)}
}
