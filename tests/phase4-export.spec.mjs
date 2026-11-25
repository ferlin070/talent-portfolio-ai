import {test,expect} from "@playwright/test";
import {build} from "esbuild";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";

const origin="http://127.0.0.1:3000";
const markers=Array.from({length:14},(_,i)=>"TALENTQA"+String(i+1).padStart(2,"0"));
const titles=["Tiga Kekuatan Utama","Empat Jurang Kemahiran","Pelan Belajar 30/60/90 Hari","Dua Projek Praktikal","Soalan untuk Melengkapkan Data"];
let offset=0;
const report=["Ringkasan sintetik QA.",...titles.map((title,i)=>{
 const count=[3,4,3,2,2][i];
 return "### "+(i+1)+". "+title+"\n"+Array.from({length:count},()=>"- **"+markers[offset++]+":** Bukti sintetik & cadangan pembangunan kerjaya. Ini ialah data ujian sahaja dan bukan rekod pengguna sebenar.").join("\n");
})].join("\n\n");

test("career report exports real PDF and editable DOCX with identical synthetic evidence",async({page})=>{
 test.setTimeout(90000);
 // Bundle the real UI and exporters only for this disposable browser test.
 const source='import React from "react";import {createRoot} from "react-dom/client";import CareerReport from "./components/career-report";createRoot(document.getElementById("qa")).render(<CareerReport text={'+JSON.stringify(report)+'} role="QA Engineer" model="Gemini mock" usedSlot={null} onCopy={()=>{}}/>);';
 const result=await build({stdin:{contents:source,loader:"tsx",resolveDir:process.cwd()},bundle:true,write:false,format:"iife",platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'}});
 await page.route(origin+"/__qa_report",route=>route.fulfill({contentType:"text/html",body:'<!doctype html><html><body><div id="qa"></div><script src="/__qa_report.js"></script></body></html>'}));
 await page.route(origin+"/__qa_report.js",route=>route.fulfill({contentType:"application/javascript",body:result.outputFiles[0].text}));
 await page.goto(origin+"/__qa_report");
 await expect(page.locator(".tf-report-section")).toHaveCount(5);
 for(const marker of markers)await expect(page.locator(".tf-career-report").getByText(marker+":",{exact:true})).toBeVisible();
 // Prevent the native print dialog, but exercise the actual popup and print DOM.
 await page.evaluate(()=>{const open=window.open;window.open=function(...args){const popup=open.apply(window,args);if(popup)popup.print=()=>{popup.document.body.dataset.printReady="yes"};return popup;};});
 const popupPromise=page.waitForEvent("popup");
 await page.getByRole("button",{name:"Export PDF"}).click();
 const popup=await popupPromise;
 await expect(popup.locator("body")).toHaveAttribute("data-print-ready","yes",{timeout:20000});
 await expect(popup.locator(".tf-report-section")).toHaveCount(5);
 await expect.poll(()=>popup.locator("img").evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
 const pdf=await popup.pdf({preferCSSPageSize:true,printBackground:true});
 expect(pdf.subarray(0,5).toString()).toBe("%PDF-");
 const pdfText=spawnSync("pdftotext",["-","-"],{input:pdf,encoding:"utf8"});
 expect(pdfText.status,pdfText.stderr).toBe(0);
 await popup.close();
 const downloadPromise=page.waitForEvent("download");
 await page.getByRole("button",{name:"Export Word"}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/\.docx$/);
 const docx=readFileSync(await download.path());
 const inspected=spawnSync("python3",["-c",[
  "import sys,io,zipfile,xml.etree.ElementTree as ET",
  "z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))",
  "assert z.testzip() is None",
  "for name in ('[Content_Types].xml','_rels/.rels','word/document.xml','word/styles.xml','word/_rels/document.xml.rels'): ET.fromstring(z.read(name))",
  "for name in ('word/media/tvetmara-besut.png','word/media/dfk-incubator.png'): assert z.read(name).startswith(b'\\x89PNG\\r\\n\\x1a\\n')",
  "root=ET.fromstring(z.read('word/document.xml'))",
  "print(' '.join(node.text or '' for node in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')))"
 ].join("\n")],{input:docx,encoding:"utf8"});
 expect(inspected.status,inspected.stderr).toBe(0);
 for(const marker of markers){expect(pdfText.stdout).toContain(marker);expect(inspected.stdout).toContain(marker);}
 for(const title of titles){expect(pdfText.stdout.replace(/\s+/g," ")).toContain(title);expect(inspected.stdout).toContain(title);}
 expect(pdfText.stdout).not.toContain("TAMAT_LAPORAN");
 expect(inspected.stdout).not.toContain("TAMAT_LAPORAN");
});

test("Resume Studio prints all three templates and blocks failed data loads",async({page})=>{
 test.setTimeout(90000);
 const mockDb='const failed=()=>location.search.includes("fail=1");const rows={profiles:{display_name:"TALENTCV Name",headline:"QA Engineer",bio:"TALENTCV Summary"},skills:[{id:"s1",name:"TALENTCV Skill",self_rating:3}],projects:[{id:"p1",title:"TALENTCV Project",description:"Synthetic evidence",url:"javascript:alert(1)"}],education:[],work_experience:[],project_images:[]};export function getSupabaseClient(){return {auth:{getUser:async()=>({data:{user:{id:"qa-id",email:"qa@example.invalid"}},error:null})},from(table){const result=()=>({data:rows[table],error:failed()?{message:"fixture failure"}:null});return {select(){return this},eq(){return this},order:async()=>result(),maybeSingle:async()=>result()}}}}';
 const bundle=await build({stdin:{contents:'import React from "react";import {createRoot} from "react-dom/client";import Resume from "./app/resume/page";createRoot(document.getElementById("qa")).render(<Resume/>);',loader:"tsx",resolveDir:process.cwd()},bundle:true,write:false,format:"iife",platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"resume-fixture",setup(b){b.onResolve({filter:/^@\/lib\/supabase$/},()=>({path:"db",namespace:"fixture"}));b.onResolve({filter:/^next\/link$/},()=>({path:"link",namespace:"fixture"}));b.onLoad({filter:/.*/,namespace:"fixture"},({path})=>({contents:path==="db"?mockDb:'import React from "react";export default function Link(props){return React.createElement("a",props)}',loader:"js",resolveDir:process.cwd()}));}}]});
 const css=readFileSync("app/quality-fixes.css","utf8");
 await page.route(origin+"/__qa_resume**",route=>route.fulfill({contentType:"text/html",body:'<!doctype html><html><head><style>'+css+'</style></head><body><div id="qa"></div><script src="/__qa_cv_bundle.js"></script></body></html>'}));
 await page.route(origin+"/__qa_cv_bundle.js",route=>route.fulfill({contentType:"application/javascript",body:bundle.outputFiles[0].text}));
 await page.goto(origin+"/__qa_resume");
 await expect(page.getByRole("heading",{name:"TALENTCV Name"})).toBeVisible();
 await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
 const print=page.getByRole("button",{name:"Print / Save as PDF"});
 await expect(print).toBeEnabled();
 await page.evaluate(()=>{window.print=()=>{document.body.dataset.cvPrinted="yes"}});
 await print.click();
 await expect(page.locator("body")).toHaveAttribute("data-cv-printed","yes");
 await page.getByLabel("Gambar profil").uncheck();
 await expect(page.locator(".tf-cv-portrait")).toHaveCount(0);
 for(const name of ["Executive","Modern","Creative"]){
  await page.getByRole("button",{name:new RegExp(name)}).click();
  await expect(page.locator(".tf-resume-document")).toHaveClass(new RegExp("tf-resume-"+name.toLowerCase()));
  const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
  expect(pdf.subarray(0,5).toString()).toBe("%PDF-");
  const result=spawnSync("pdftotext",["-","-"],{input:pdf,encoding:"utf8"});
  expect(result.status,result.stderr).toBe(0);
  for(const token of ["TALENTCV Name","TALENTCV Skill","TALENTCV Project"])expect(result.stdout.replace(/\s+/g," ")).toContain(token);
  expect(result.stdout).not.toContain("Print / Save as PDF");
 }
 await page.goto(origin+"/__qa_resume?fail=1");
 await expect(page.getByRole("alert")).toBeVisible();
 await expect(print).toBeDisabled();
});
