import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import {randomUUID} from "node:crypto";

const origin="http://127.0.0.1:3000";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service=process.env.TF_CI_LOCAL_SERVICE_ROLE;
const themes=["modern","minimal","tech","amber","neon","crimson","sunny","student3d","noirluxe"];
const sections={skills:true,education:true,experience:true,projects:true,location:false,website:false};
const opts={auth:{persistSession:false,autoRefreshToken:false}};
function checked(result,label){
 if(result.error)throw Error(label+": "+(result.error.code||result.error.name||"failure"));
 return result.data;
}

test("real local Auth, owner isolation, nine published templates and unpublish",async({page,browser,request})=>{
 test.setTimeout(180000);
 // Hard fail rather than accidentally creating fixtures on a hosted database.
 if(process.env.CI!=="true"||url!=="http://127.0.0.1:54321"||!key||!service||key===service)throw Error("Disposable localhost Supabase is required");
 const admin=createClient(url,service,opts);
 const anon=createClient(url,key,opts);
 const clients=[createClient(url,key,opts),createClient(url,key,opts)];
 const ids=[];
 const suffix=randomUUID().slice(0,8);
 const emails=["a","b"].map(x=>"talentfolio-qa-"+x+"-"+suffix+"@example.com");
 const password="Qa-local-"+randomUUID();
 const publicContext=await browser.newContext();
 try{
  for(let i=0;i<2;i++){
   const user=checked(await admin.auth.admin.createUser({email:emails[i],password,email_confirm:true}),"create synthetic user").user;
   ids.push(user.id);
   checked(await clients[i].auth.signInWithPassword({email:emails[i],password}),"local password auth");
   checked(await clients[i].from("profiles").upsert({user_id:user.id,display_name:i===0?"Talentfolio QA Alpha":"Talentfolio QA Beta",headline:"Synthetic QA Engineer",bio:"TALENTFOLIOQA-BIO",location:"TALENTFOLIOQA-PRIVATE-LOCATION",website:"https://private-qa.example.com"}),"owner profile write");
  }
  const owner=clients[0],other=clients[1];
  checked(await owner.from("skills").insert({user_id:ids[0],name:"TALENTFOLIOQA-SKILL",self_rating:3}),"skill fixture");
  checked(await owner.from("projects").insert([{user_id:ids[0],title:"TALENTFOLIOQA-PUBLIC-PROJECT",description:"Public synthetic evidence",is_public:true},{user_id:ids[0],title:"TALENTFOLIOQA-PRIVATE-PROJECT",description:"Private synthetic evidence",is_public:false}]),"project fixtures");
  checked(await owner.from("certificates").insert({user_id:ids[0],name:"TALENTFOLIOQA-PRIVATE-CERT"}),"certificate fixture");
  expect(checked(await other.from("profiles").select("display_name").eq("user_id",ids[0]),"cross-owner read")).toEqual([]);
  expect(checked(await other.from("certificates").select("name").eq("user_id",ids[0]),"cross-owner certificate read")).toEqual([]);
  expect(checked(await other.from("profiles").update({display_name:"Unauthorized"}).eq("user_id",ids[0]).select("display_name"),"cross-owner update")).toEqual([]);
  await page.goto(origin+"/auth?next=/resume");
  await page.getByPlaceholder("name@example.com").fill(emails[0]);
  await page.getByPlaceholder("Kata laluan akaun").fill(password);
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await expect(page).toHaveURL(origin+"/resume",{timeout:30000});
  await expect(page.getByRole("heading",{name:"Talentfolio QA Alpha"})).toBeVisible({timeout:30000});
  await expect(page.getByRole("button",{name:"Print / Save as PDF"})).toBeEnabled();
  for(const route of ["/dashboard","/portfolio","/skills","/settings"]){
   const result=await page.goto(origin+route);
   expect(result?.status()).toBe(200);
   await expect(page).toHaveURL(origin+route);
  }
  await page.goto(origin+"/skills");
  const studio=page.getByRole("region",{name:"Career Studio",exact:true});
  await expect(studio).toBeVisible({timeout:30000});
  await studio.getByLabel("Syarat kemahiran").fill("TALENTFOLIOQA-SKILL\nUnknown-qa-skill");
  await studio.getByRole("button",{name:"Semak padanan"}).click();
  await expect(studio.getByText("1 daripada 2 syarat mempunyai padanan nama kemahiran.")).toBeVisible();
  await expect(studio.getByRole("progressbar",{name:"Liputan nama kemahiran"})).toHaveAttribute("value","50");
  await studio.getByLabel("Syarat kemahiran").fill(" ");
  await studio.getByRole("button",{name:"Semak padanan"}).click();
  await expect(studio.getByRole("alert")).toBeVisible();
  await expect(studio.getByText("HARI 30",{exact:true})).toBeVisible();
  await studio.getByRole("button",{name:"Lihat panduan jawapan"}).click();
  await expect(studio.getByRole("button",{name:"Sembunyikan panduan"})).toHaveAttribute("aria-expanded","true");
  await studio.getByLabel("Jawapan latihan").fill("Synthetic STAR practice answer");
  await studio.getByRole("button",{name:"Tandakan sudah dilatih"}).click();
  await studio.getByRole("button",{name:"Soalan seterusnya"}).click();
  await expect(studio.getByText(/Soalan 2\//)).toBeVisible();
  await studio.getByRole("button",{name:"Mula semula"}).click();
  await expect(studio.getByText(/Soalan 1\//)).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await studio.evaluate(el=>el.scrollWidth<=el.clientWidth+2),"Career Studio mobile overflow").toBe(true);
  await page.setViewportSize({width:1440,height:900});
  const session=checked(await owner.auth.getSession(),"owner session").session;
  const headers={authorization:"Bearer "+session.access_token,origin};
  const endpoint=origin+"/api/portfolio/publish";
  const invalid=await request.post(endpoint,{headers,data:"null"});
  expect(invalid.status(),await invalid.text()).toBe(400);
  expect((await request.post(endpoint,{headers:{...headers,origin:"https://untrusted.example"},data:{action:"publish"}})).status()).toBe(403);
  expect((await request.post(endpoint,{data:{action:"publish"}})).status()).toBe(401);
  const publicPage=await publicContext.newPage();
  let previous=null;
  for(const template of themes){
   const slug="tf-qa-"+suffix+"-"+template;
   const publish=await request.post(endpoint,{headers,data:{action:"publish",slug,template,sections,noindex:true,openToOpportunities:false}});
   expect(publish.status(),"publish "+template+": "+await publish.text()).toBe(200);
   const record=checked(await anon.rpc("get_published_portfolio_seo",{p_slug:slug}),"public lookup");
   expect(record).toHaveLength(1);
   expect(record[0].template).toBe(template);
   expect(record[0].noindex).toBe(true);
   expect(record[0].snapshot.location).toBe("");
   expect(record[0].snapshot.website).toBe("");
   expect(record[0].snapshot.open_to_opportunities).toBe(false);
   expect(JSON.stringify(record)).not.toContain("TALENTFOLIOQA-PRIVATE");
   if(previous)expect(checked(await anon.rpc("get_published_portfolio_seo",{p_slug:previous}),"previous slug lookup")).toEqual([]);
   await publicPage.setViewportSize({width:1440,height:900});
   const res=await publicPage.goto(origin+"/u/"+slug);
   expect(res?.status(),template).toBe(200);
   await expect(publicPage.locator("body")).toContainText("TALENTFOLIOQA-PUBLIC-PROJECT");
   await expect(publicPage.locator("body")).not.toContainText("TALENTFOLIOQA-PRIVATE");
   await expect(publicPage.locator('meta[name="robots"]')).toHaveAttribute("content",/noindex/);
   await expect(publicPage.locator('link[rel="canonical"]')).toHaveAttribute("href",/\/u\/tf-qa-/);
   await publicPage.setViewportSize({width:390,height:844});
   await expect(publicPage.locator("h1").first()).toBeVisible();
   expect(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),template+" mobile horizontal overflow").toBe(true);
   previous=slug;
  }
  expect((await request.post(endpoint,{headers,data:{action:"unpublish"}})).status()).toBe(200);
  expect(checked(await anon.rpc("get_published_portfolio_seo",{p_slug:previous}),"unpublish lookup")).toEqual([]);
  expect((await publicPage.goto(origin+"/u/"+previous))?.status()).toBe(404);
 }finally{
  await publicContext.close();
  await Promise.allSettled(clients.map(c=>c.auth.signOut()));
  for(const id of ids)await admin.auth.admin.deleteUser(id);
 }
});
