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
