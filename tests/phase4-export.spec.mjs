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
