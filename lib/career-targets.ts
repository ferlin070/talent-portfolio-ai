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

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9+#.\/\-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * A recognised phrase must be an independent phrase, never a substring.
 * Example: "C" does NOT match "Cloud Computing", nor "R" match "React".
 */
export function matchesSkillPhrase(skill: string, phrase: string): boolean {
  const source = normalize(skill);
  const expected = normalize(phrase);
  if (!source || !expected || expected.length < 2) return source === expected && !!source;
  if (source === expected) return true;
  return (` ${source} `).includes(` ${expected} `);
}

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
