import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("global keyboard skip link and main content anchors exist",()=>{
 const layout=read("app/layout.tsx");
 const home=read("app/page.tsx");
 const workspace=read("components/workspace.tsx");
 assert.match(layout,/href="#tf-main-content"/);
 assert.match(layout,/tf-skip-link/);
 assert.match(home,/id="tf-main-content"/);
 assert.match(workspace,/id="tf-main-content"/);
});

test("responsive navigation exposes state and supports keyboard Escape",()=>{
 const code=read("components/workspace.tsx");
 assert.match(code,/aria-expanded=\{mobile\}/);
 assert.match(code,/aria-controls="tf-workspace-sidebar"/);
 assert.match(code,/aria-current=\{pathname===href\?"page":undefined\}/);
 assert.match(code,/event\.key==="Escape"/);
 assert.match(code,/event\.key!=="Tab"/);
 assert.match(code,/priorOverflow=document\.body\.style\.overflow/);
});

test("gallery modal traps focus, restores it and supports keyboard arrows",()=>{
 const code=read("components/project-gallery-public.tsx");
 assert.match(code,/aria-modal="true"/);
 assert.match(code,/event\.key==="ArrowRight"/);
 assert.match(code,/event\.key==="ArrowLeft"/);
 assert.match(code,/event\.key==="Escape"/);
 assert.match(code,/previous\?\.focus\(\)/);
 assert.match(code,/loading="lazy" decoding="async"/);
});

test("landing demonstration explicitly identifies example data",()=>{
 const code=read("components/marketing-preview.tsx");
 assert.match(code,/CONTOH PAPARAN/);
 assert.match(code,/Perkembangan kemahiran/);
 assert.match(code,/Contoh antaramuka/);
});

test("initial route chunk excludes costly workspace sections",()=>{
 const code=read("components/workspace.tsx");
 for(const component of [
  "history-editor","project-gallery-editor","ai-skills-analysis",
  "prompt-generator","portfolio-themes","portfolio-expansion",
 ]){
  assert.ok(code.includes(`dynamic(()=>import("@/components/${component}")`));
 }
 assert.match(code,/WorkspaceSkeleton/);
});

test("responsive motion preferences and breakpoints remain available",()=>{
 const css=read("app/phase3-premium.css");
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:840px\)/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/:focus-visible/);
});


test("public portfolio distinguishes missing records from backend errors",()=>{
 const code=read("app/u/[slug]/page.tsx");
 assert.match(code,/if\(error\)\{[\s\S]*?throw new Error\("Public portfolio lookup temporarily unavailable"\)/);
 assert.match(code,/if\(!Array\.isArray\(data\)\|\|data\.length>1\)/);
 assert.match(code,/if\(data\.length===0\)notFound\(\)/);
 assert.doesNotMatch(code,/if\(error\|\|[^\n]*\)notFound\(\)/);
 assert.match(code,/slug\.length<3\|\|slug\.length>48/);
});
