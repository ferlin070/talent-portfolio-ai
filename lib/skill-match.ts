/**
 * Boundary-aware matching of a self-reported skill against target phrases.
 * Must never assume one-character aliases match longer unrelated terms.
 */
function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9+#.\/\-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesSkillPhrase(skill: string, phrase: string): boolean {
  const source = normalize(skill);
  const expected = normalize(phrase);

  if (!source || !expected) return false;
  if (source === expected) return true;
  if (expected.length < 2) return false;

  return (` ${source} `).includes(` ${expected} `);
}
