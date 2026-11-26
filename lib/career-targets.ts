import definitions from "@/data/career-targets.json";

export type SkillEvidence = {
  name: string;
  self_rating: number | null;
};

export type SkillTarget = {
  name: string;
  target: number;
  aliases: string[];
};

export type CareerTarget = {
  id: string;
  title: string;
  skills: SkillTarget[];
};

/** These targets are illustrative, not validated industry qualification levels. */
export const CAREER_TARGETS: CareerTarget[] = definitions;

export { matchesSkillPhrase } from "@/lib/skill-match";
import { matchesSkillPhrase } from "@/lib/skill-match";

export function measureCareerTarget(
  target: CareerTarget,
  skills: SkillEvidence[],
) {
  return target.skills.map((item) => {
    const phrases = [item.name, ...item.aliases];
    const scores = skills
      .filter((skill) => phrases.some((phrase) => matchesSkillPhrase(skill.name, phrase)))
      .map((skill) => skill.self_rating ?? 0);

    const score = scores.length ? Math.max(...scores) : 0;

    return {
      label: item.name,
      score,
      target: item.target,
      gap: Math.max(0, item.target - score),
    };
  });
}
