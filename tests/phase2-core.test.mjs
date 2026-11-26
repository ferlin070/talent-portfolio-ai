import test from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../lib/safe-next.ts";
import { matchesSkillPhrase } from "../lib/skill-match.ts";
import {
  validPortfolioSlug, normalizeSections, visualFingerprint, buildDraftSnapshot,
} from "../lib/portfolio-publishing.ts";

test("single-letter skills do not match whole categories", () => {
  assert.equal(matchesSkillPhrase("C", "Cloud Computing"), false);
  assert.equal(matchesSkillPhrase("R", "React"), false);
  assert.equal(matchesSkillPhrase("C", "C"), true);
});

test("matches whole names and boundary-safe aliases", () => {
  assert.equal(matchesSkillPhrase("React", "React"), true);
  assert.equal(matchesSkillPhrase("React + TypeScript", "React"), true);
  assert.equal(matchesSkillPhrase("Cloud Computing", "Cloud"), true);
  assert.equal(matchesSkillPhrase("Node.js", "Node.js"), true);
  assert.equal(matchesSkillPhrase("Graphical", "Git"), false);
  assert.equal(matchesSkillPhrase("MySQL", "SQL"), false);
  assert.equal(matchesSkillPhrase("CNC machining", "C"), false);
});

test("protects reserved slugs and requires safe format", () => {
  assert.equal(validPortfolioSlug("Kaihara-Dev"), "kaihara-dev");
  assert.throws(() => validPortfolioSlug("admin"), /sistem/);
  assert.throws(() => validPortfolioSlug("a"), /3–48/);
  assert.throws(() => validPortfolioSlug("my slug"), /3–48/);
  assert.throws(() => validPortfolioSlug("x".repeat(49)), /3–48/);
});

test("privacy controls default to published-section compatibility", () => {
  const sections = normalizeSections({ skills: false, location: false });
  assert.equal(sections.skills, false);
  assert.equal(sections.location, false);
  assert.equal(sections.projects, true);
  assert.equal(sections.education, true);
});

test("draft snapshot excludes deselected sensitive sections", () => {
  const snapshot = buildDraftSnapshot({
    profile: {
      display_name: "Sample User",
      headline: "Developer",
      bio: "My portfolio",
      location: "Private Town",
      website: "https://example.org",
      avatar_url: "",
    },
    sections: normalizeSections({
      skills: false, education: false, experience: false,
      projects: false, location: false, website: false,
    }),
    skills: [{ name: "Sensitive Skill" }],
    projects: [{
      id: "project-1", title: "Private project",
      description: "Sensitive", url: null,
      is_public: true, created_at: "2026-01-01",
    }],
    projectImages: [],
    education: [{
      institution: "Private School", qualification: "Diploma",
      field_of_study: "Private",
      start_year: 2020, end_year: 2022, description: "",
    }],
    experience: [{
      company: "Private Employer", role: "Engineer",
      start_date: "2023-01-01", end_date: null, description: "",
    }],
    openToOpportunities: false,
  });

  assert.equal(snapshot.name, "Sample User");
  assert.equal(snapshot.location, "");
  assert.equal(snapshot.website, "");
  assert.deepEqual(snapshot.skills, []);
  assert.deepEqual(snapshot.projects, []);
  assert.deepEqual(snapshot.education, []);
  assert.deepEqual(snapshot.experience, []);
  assert.equal(snapshot.open_to_opportunities, false);
});

test("UI fingerprints are key-order independent", () => {
  assert.equal(
    visualFingerprint({ b: 2, a: 1 }),
    visualFingerprint({ a: 1, b: 2 }),
  );
  assert.notEqual(
    visualFingerprint({ skills: [] }),
    visualFingerprint({ skills: [{ name: "SQL" }] }),
  );
});


test("auth redirects stay same-origin and preserve workspace deep links", () => {
  for (const value of [null, "", "https://example.invalid", "//example.invalid", "/\\example.invalid", "/\t/example.invalid", "/a/..//example.invalid", "/%2fexample.invalid", "/%5cexample.invalid", "/auth", "/auth/callback"]) {
    assert.equal(safeNext(value), "/dashboard", String(value));
  }
  assert.equal(safeNext("/resume?template=modern#cv"), "/resume?template=modern#cv");
  assert.equal(safeNext("/portfolio"), "/portfolio");
});


import { verifyCareerReport } from "../lib/career-validation.ts";
import { parseCareerReport } from "../lib/career-report.ts";

const reportSections=[
 ["1. Tiga Kekuatan Utama",3],
 ["2. Empat Jurang Kemahiran",4],
 ["3. Pelan Belajar 30/60/90 Hari",3],
 ["4. Dua Projek Praktikal",2],
 ["5. Soalan untuk Melengkapkan Data",2],
].map(([title,count])=>"### "+title+"\n"+Array.from({length:count},(_,i)=>"- **Bukti "+(i+1)+":** Contoh sintetik untuk menguji kelengkapan laporan & kesamaan kandungan. Cadangan langkah praktikal yang boleh dibuktikan.").join("\n"));
const reportOf=(sections=reportSections)=>["Ringkasan sintetik.",...sections,"TAMAT_LAPORAN"].join("\n\n");

test("Gemini report accepts five ordered complete sections and strips terminal marker",()=>{
 const checked=verifyCareerReport(reportOf(),"STOP");
 assert.equal(checked.complete,true,checked.issues.join(" "));
 assert.ok(!checked.clean.includes("TAMAT_LAPORAN"));
 const parsed=parseCareerReport(checked.clean);
 assert.deepEqual(parsed.sections.map(s=>s.kind),["strength","gap","roadmap","project","question"]);
 assert.deepEqual(parsed.sections.map(s=>s.blocks.length),[3,4,3,2,2]);
});

test("Gemini report rejects truncation, joined or repeated markers and reordered sections",()=>{
 const report=reportOf();
 for(const candidate of [report.replace(/\n\nTAMAT_LAPORAN$/,""),report.replace(/\n\nTAMAT_LAPORAN$/," TAMAT_LAPORAN"),report.replace("Ringkasan sintetik.","TAMAT_LAPORAN"),reportOf([reportSections[1],reportSections[0],...reportSections.slice(2)]),reportOf(reportSections.slice(0,4))]){
   assert.equal(verifyCareerReport(candidate,"STOP").complete,false);
 }
 assert.equal(verifyCareerReport(report,"MAX_TOKENS").complete,false);
});

test("shared print and Word report parser preserves text and removes Markdown separators",()=>{
 const parsed=parseCareerReport("Ringkasan & fakta <ujian>\n---\n### 1. Kekuatan\n- **Bukti:** A & B\n  sambungan isi\n***\nTAMAT_LAPORAN");
 assert.deepEqual(parsed.intro,[{type:"paragraph",text:"Ringkasan & fakta <ujian>"}]);
 assert.deepEqual(parsed.sections[0].blocks,[{type:"bullet",text:"**Bukti:** A & B sambungan isi"}]);
});

import { isAllowedRequestOrigin } from "../lib/request-origin.ts";
test("strict origin validation permits only equivalent loopback aliases in disposable CI",()=>{
 const oldCI=process.env.CI,oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const target="http://localhost:3000/api/portfolio/publish";
 try{
  process.env.CI="true";
  process.env.NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321";
  assert.equal(isAllowedRequestOrigin("http://127.0.0.1:3000",target),true);
  assert.equal(isAllowedRequestOrigin("http://localhost:3000",target),true);
  assert.equal(isAllowedRequestOrigin(null,target),true);
  for(const origin of ["https://127.0.0.1:3000","http://127.0.0.1:3001","https://evil.example","http://localhost:3000.evil.example","http://localhost:3000/path","null",""]){
   assert.equal(isAllowedRequestOrigin(origin,target),false,origin);
  }
  process.env.CI="false";
  assert.equal(isAllowedRequestOrigin("http://127.0.0.1:3000",target),false);
  assert.equal(isAllowedRequestOrigin("https://talent-portfolio-ai.vercel.app","https://talent-portfolio-ai.vercel.app/api/portfolio/publish"),true);
  process.env.CI="true";
  process.env.NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co";
  assert.equal(isAllowedRequestOrigin("http://127.0.0.1:3000",target),false);
 }finally{
  if(oldCI===undefined)delete process.env.CI;else process.env.CI=oldCI;
  if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;
 }
});
