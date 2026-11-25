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
