import test from "node:test";
import assert from "node:assert/strict";
import {parseRequirements,compareRequirements,buildGrowthPlan,buildInterviewQuestions} from "../lib/career-studio.ts";

test("career requirements trim bullet markers, preserve labels and deduplicate",()=>{
 assert.deepEqual(parseRequirements("  SQL  \r\n- Linux\nsql\n• Git\n\n* Git "),["SQL","Linux","Git"]);
 assert.deepEqual(parseRequirements(" \n \n"),[]);
 assert.throws(()=>parseRequirements("a".repeat(101)),/100/);
 assert.throws(()=>parseRequirements(Array.from({length:26},(_,i)=>"skill "+i).join("\n")),/25/);
});
test("job fit measures name matches only and avoids substring false positives",()=>{
 const skills=[{name:"MySQL",self_rating:5},{name:"React + TypeScript",self_rating:2},{name:"Cloud Computing",self_rating:null},{name:"Linux",self_rating:null}];
 const result=compareRequirements(["SQL","React","C","Linux"],skills);
 assert.equal(result.matched,2);
 assert.equal(result.coverage,50);
 assert.deepEqual(result.entries.map(x=>x.matched),[false,true,false,true]);
 assert.deepEqual(result.entries[1].evidence,["React + TypeScript"]);
 assert.equal(compareRequirements([],skills).coverage,null);
 assert.equal(compareRequirements(["Git"],[]).coverage,0);
});
test("roadmap prioritizes up to three unmet targets without changing input",()=>{
 const gaps=[{label:"A",score:4,target:4,gap:0},{label:"SQL",score:0,target:4,gap:4},{label:"Linux",score:2,target:4,gap:2},{label:"Git",score:1,target:4,gap:3},{label:"Docker",score:2,target:3,gap:1}];
 const plan=buildGrowthPlan(gaps);
 assert.deepEqual(plan.focus,["SQL","Git","Linux"]);
 assert.deepEqual(plan.milestones.map(m=>m.day),[30,60,90]);
 assert.match(plan.milestones[1].action,/SQL, Git, Linux/);
 assert.equal(gaps[0].label,"A");
 assert.deepEqual(buildGrowthPlan([gaps[0]]).focus,[]);
});
test("interview prompts reflect selected role and avoid fabricated credentials",()=>{
 const questions=buildInterviewQuestions("Cloud Engineer",["Linux","Docker","Git"]);
 assert.equal(questions.length,6);
 assert.match(questions[0].question,/Cloud Engineer/);
 assert.match(questions[2].question,/Linux/);
 assert.match(questions[3].question,/Docker/);
 assert.equal(buildInterviewQuestions("Data Analyst",[]).length,4);
 assert.ok(questions.every(q=>q.hint.length>0));
});

import {reviewResume,buildCoverLetter} from "../lib/application-studio.ts";

test("resume review detects bounded punctuation-aware terms and bilingual headings",()=>{
 const result=reviewResume("Ringkasan:\nQA student\nKemahiran\nMySQL, React, C++, C#, .NET, Node.js, Git.\nPendidikan\nProjek\nSynthetic demo","SQL\nReact\nC\nC++\nC#\n.NET\nNode.js\nGit");
 assert.deepEqual(result.entries.map(r=>r.matched),[false,true,false,true,true,true,true,true]);
 assert.equal(result.coverage,75);
 assert.ok(result.sections.every(s=>s.found));
 assert.equal(reviewResume("Git","Git").sections.some(s=>s.found),false);
});
test("resume review rejects empty and oversized inputs and limits keywords",()=>{
 assert.throws(()=>reviewResume(" ","Git"),/resume/);
 assert.throws(()=>reviewResume("Git"," "),/syarat/);
 assert.throws(()=>reviewResume("x".repeat(20001),"Git"),/20,000/);
 assert.throws(()=>reviewResume("Git",Array.from({length:26},(_,i)=>"skill "+i).join("\n")),/25/);
});
const letterFixture={name:"QA Alpha",role:"Cloud Engineer",company:"Example Company",language:"ms",evidence:[{id:"skill:1",kind:"skill",label:"Linux"},{id:"project:1",kind:"project",label:"Synthetic Demo"}]};
test("cover letters use only selected evidence, correct language and no invented credentials",()=>{
 const ms=buildCoverLetter(letterFixture),en=buildCoverLetter({...letterFixture,language:"en"});
 assert.match(ms,/PERMOHONAN JAWATAN: Cloud Engineer/);
 assert.match(en,/APPLICATION FOR: Cloud Engineer/);
 assert.match(ms,/Kemahiran direkodkan: Linux/);
 assert.match(en,/Project: Synthetic Demo/);
 for(const s of [ms,en]){assert.match(s,/QA Alpha/);assert.match(s,/Example Company/);assert.doesNotMatch(s,/certified|pakar|years of experience|private/i)}
 assert.doesNotMatch(buildCoverLetter({...letterFixture,evidence:[letterFixture.evidence[0]]}),/Synthetic Demo/);
});
test("cover letter requires explicit evidence and prevents multiline field injection",()=>{
 assert.throws(()=>buildCoverLetter({...letterFixture,company:" "}),/Organisasi/);
 assert.throws(()=>buildCoverLetter({...letterFixture,evidence:[]}),/rekod/);
 assert.throws(()=>buildCoverLetter({...letterFixture,evidence:Array(7).fill(letterFixture.evidence[0])}),/enam/);
 assert.throws(()=>buildCoverLetter({...letterFixture,name:"x".repeat(101)}),/Nama/);
 assert.match(buildCoverLetter({...letterFixture,company:"Example\nCompany"}),/Example Company/);
});
