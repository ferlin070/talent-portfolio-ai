import { matchesSkillPhrase } from "./skill-match.ts";

export type CareerEvidence = { name: string; self_rating: number | null };
export type CareerGap = { label: string; score: number; target: number; gap: number };
export const MAX_REQUIREMENTS = 25;
export const MAX_REQUIREMENT_LENGTH = 100;

/** Explicit user-entered requirements, not inferred from a job advertisement. */
export function parseRequirements(input: string): string[] {
 const seen = new Set<string>();
 const result: string[] = [];
 for (const line of input.split(/\r?\n/)) {
  const value = line.trim().replace(/^[-*•]\s+/, "").trim();
  if (!value) continue;
  if (value.length > MAX_REQUIREMENT_LENGTH) throw new Error("Setiap syarat mesti maksimum 100 aksara.");
  const normalized = value.normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/g," ");
  if (seen.has(normalized)) continue;
  if (result.length >= MAX_REQUIREMENTS) throw new Error("Maksimum 25 syarat unik bagi setiap semakan.");
  seen.add(normalized);
  result.push(value);
 }
 return result;
}

export function compareRequirements(requirements: string[], skills: CareerEvidence[]) {
 const entries = requirements.map(requirement => {
  const evidence = skills.filter(skill => matchesSkillPhrase(skill.name, requirement));
  return {requirement, evidence: evidence.map(skill=>skill.name), matched: evidence.length > 0};
 });
 const matched = entries.filter(entry=>entry.matched).length;
 return {entries, matched, total:entries.length, coverage:entries.length?Math.round(100*matched/entries.length):null};
}

/** A practical planning suggestion, not an assessment of professional competence. */
export function buildGrowthPlan(gaps: CareerGap[]) {
 const priorities = gaps.filter(g=>g.gap>0).slice().sort((a,b)=>b.gap-a.gap||a.label.localeCompare(b.label,"en")).slice(0,3);
 const focus = priorities.map(g=>g.label);
 const names = focus.join(", ");
 return {
  focus,
  milestones: [
   {day:30,title:"Asas dan pembelajaran",action:focus.length?"Pelajari konsep asas "+names+"; buat latihan kecil dan catat perkara yang belum difahami.":"Semak bukti kemahiran sedia ada bersama mentor dan pilih satu kemahiran untuk diperkukuh.",evidence:"Nota pembelajaran dan satu latihan yang boleh ditunjukkan."},
   {day:60,title:"Projek bukti kerja",action:focus.length?"Bina satu projek kecil yang menggunakan "+names+"; dokumentasikan keputusan dan batasannya.":"Bina projek baharu yang menggabungkan kemahiran sedia ada dan dokumentasikan keputusan.",evidence:"Demo projek, dokumentasi dan maklum balas mentor."},
   {day:90,title:"Persediaan kerjaya",action:"Semak bukti dengan mentor, kemas kini portfolio dan resume dengan pencapaian sebenar, kemudian latih jawapan temu duga.",evidence:"Portfolio dikemas kini dan senarai tindakan susulan."},
  ],
 };
}

export function buildInterviewQuestions(role: string, focus: string[]) {
 return [
  {question:"Ceritakan tentang diri anda dan mengapa anda berminat dengan jawatan "+role+".",hint:"Hubungkan latar belakang sebenar dengan jawatan. Jangan reka pengalaman."},
  {question:"Ceritakan satu projek atau tugasan yang paling mencabar.",hint:"Nyatakan situasi, tugas, tindakan sendiri dan hasil sebenar (STAR)."},
  ...focus.slice(0,2).map(skill=>({question:"Bagaimana anda akan menunjukkan kemahiran "+skill+" melalui tugasan praktikal?",hint:"Terangkan langkah, bukti, cara menguji hasil dan perkara yang masih perlu dipelajari."})),
  {question:"Ceritakan satu kesilapan atau maklum balas yang membantu anda berkembang.",hint:"Terangkan apa yang berubah dalam cara kerja anda dan contoh sebenar."},
  {question:"Apakah pelan pembelajaran anda untuk 90 hari pertama?",hint:"Berikan tindakan konkrit, hasil yang boleh diperiksa dan cara meminta bantuan."},
 ];
}
