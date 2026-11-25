/** Portfolio publication privacy selections and client-side change indicator.
 * This helper does not authorize publishing. The database RPC remains the source
 * of truth for the snapshot, and hashes here are only for visual UX feedback.
 */

export const PUBLIC_SECTIONS = [
  ["skills", "Kemahiran"],
  ["education", "Pendidikan"],
  ["experience", "Pengalaman kerja"],
  ["projects", "Projek & galeri"],
  ["location", "Lokasi"],
  ["website", "Pautan website"],
] as const;

export type SectionKey = (typeof PUBLIC_SECTIONS)[number][0];
export type PortfolioSections = Record<SectionKey, boolean>;

export const DEFAULT_PUBLIC_SECTIONS: PortfolioSections = {
  skills: true,
  education: true,
  experience: true,
  projects: true,
  location: true,
  website: true,
};

export const RESERVED_SLUGS = new Set([
  "admin", "api", "auth", "dashboard", "settings",
  "profile", "projects", "education", "experience", "certificates",
  "skills", "portfolio", "resume", "prompt-generator", "u", "www",
  "login", "logout", "signup", "register", "security",
  "support", "terms", "privacy", "help", "assets",
  "static", "robots", "sitemap",
]);

export function validPortfolioSlug(raw: string): string {
  const slug = raw.trim().toLowerCase();
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length < 3 ||
    slug.length > 48
  ) {
    throw new Error(
      "Pautan mesti 3–48 aksara: huruf kecil, nombor dan tanda sempang sahaja.",
    );
  }

  if (RESERVED_SLUGS.has(slug)) {
    throw new Error("Nama pautan ini digunakan oleh sistem. Pilih nama lain.");
  }

  return slug;
}

export function normalizeSections(
  input?: Partial<Record<SectionKey, boolean>> | null,
): PortfolioSections {
  return {
    skills: input?.skills ?? true,
    education: input?.education ?? true,
    experience: input?.experience ?? true,
    projects: input?.projects ?? true,
    location: input?.location ?? true,
    website: input?.website ?? true,
  };
}

export type PortfolioDraftProfile = {
  display_name: string;
  headline: string;
  bio: string;
  location: string;
  website: string;
  avatar_url: string;
};

export type PortfolioDraftProject = {
  id: string;
  title: string;
  description: string;
  url: string | null;
  is_public: boolean;
  created_at: string;
};

export type PortfolioDraftImage = {
  project_id: string;
  storage_path: string;
  caption: string;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
};

export type PortfolioDraftEducation = {
  institution: string;
  qualification: string;
  field_of_study: string;
  start_year: number | null;
  end_year: number | null;
  description: string;
  created_at?: string;
};

export type PortfolioDraftExperience = {
  company: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
  description: string;
  created_at?: string;
};

export function buildDraftSnapshot(args: {
  profile: PortfolioDraftProfile;
  sections: PortfolioSections;
  skills: { name: string }[];
  projects: PortfolioDraftProject[];
  projectImages: PortfolioDraftImage[];
  education: PortfolioDraftEducation[];
  experience: PortfolioDraftExperience[];
  openToOpportunities: boolean;
}) {
  const {
    profile, sections, skills, projects, projectImages,
    education, experience, openToOpportunities,
  } = args;

  const orderNewest = <T extends { created_at?: string }>(items: T[]) =>
    [...items].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );

  const visibleProjects = orderNewest(projects.filter((project) => project.is_public));

  return {
    name: profile.display_name || "",
    headline: profile.headline || "",
    bio: profile.bio || "",
    location: sections.location ? profile.location || "" : "",
    website: sections.website ? profile.website || "" : "",
    avatar: profile.avatar_url || "",
    skills: sections.skills
      ? skills.map(({ name }) => ({ name }))
      : [],
    education: sections.education
      ? orderNewest(education).map((item) => ({
        institution: item.institution,
        qualification: item.qualification,
        field: item.field_of_study,
        start: item.start_year,
        end: item.end_year,
        description: item.description || "",
      }))
      : [],
    experience: sections.experience
      ? orderNewest(experience).map((item) => ({
        company: item.company,
        role: item.role,
        start: item.start_date,
        end: item.end_date,
        description: item.description || "",
      }))
      : [],
    projects: sections.projects
      ? visibleProjects.map((project) => ({
        title: project.title,
        description: project.description || "",
        url: project.url || "",
        images: projectImages
          .filter((image) => image.project_id === project.id)
          .sort((a, b) =>
            Number(b.is_cover) - Number(a.is_cover) ||
            a.sort_order - b.sort_order ||
            a.created_at.localeCompare(b.created_at),
          )
          .map((image) => ({
            url: `/storage/v1/object/public/project-gallery/${image.storage_path}`,
            caption: image.caption || "",
            is_cover: image.is_cover,
            sort_order: image.sort_order,
          })),
      }))
      : [],
    open_to_opportunities: openToOpportunities,
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(record[key])}`,
    ).join(",")}}`;
  }

  return JSON.stringify(value ?? null);
}

/** FNV-1a: deterministic non-security fingerprint for UI dirty-state. */
export function visualFingerprint(value: unknown): string {
  const serialized = stableStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function snapshotFingerprint(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return visualFingerprint({
    name: record.name ?? "",
    headline: record.headline ?? "",
    bio: record.bio ?? "",
    location: record.location ?? "",
    website: record.website ?? "",
    avatar: record.avatar ?? "",
    skills: record.skills ?? [],
    education: record.education ?? [],
    experience: record.experience ?? [],
    projects: record.projects ?? [],
    open_to_opportunities: record.open_to_opportunities ?? false,
  });
}
