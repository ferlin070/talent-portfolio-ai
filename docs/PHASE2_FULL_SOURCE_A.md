# Talentfolio AI — Fasa 2: Kod Penuh, Bahagian A

Branch: `feature/phase2-publishing-ux`. Fail di bawah lengkap seperti dalam GitHub, bukan snippet. Perubahan SQL **belum dilaksanakan di production**.

## 1. `supabase/migrations/0011_phase2_publishing_controls.sql`

````sql
-- 0011: Publishing controls, optional availability claim and SEO indexing preference.
-- Idempotent and additive. Apply after 0010 on staging before code rollout.
-- Rollback (after moving back to code that does not call v2):
--   DROP FUNCTION IF EXISTS public.get_published_portfolio_seo(text);
--   DROP FUNCTION IF EXISTS public.publish_portfolio_v2(text,text,jsonb,boolean,boolean);
--   DROP FUNCTION IF EXISTS public.tf_publication_guard(); -- restore guard from 0010
--   ALTER TABLE public.portfolio_publications DROP COLUMN IF EXISTS noindex;
--   ALTER TABLE public.portfolio_publications DROP COLUMN IF EXISTS open_to_opportunities;
--   Restore 0010 guard definition afterward. Never disable RLS.
BEGIN;

ALTER TABLE public.portfolio_publications
 ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false;
ALTER TABLE public.portfolio_publications
 ADD COLUMN IF NOT EXISTS open_to_opportunities boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.tf_publication_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.published THEN
    IF NEW.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'Tidak dibenarkan menerbitkan portfolio pengguna lain.'
        USING ERRCODE = '42501';
    END IF;

    NEW.sections := jsonb_build_object(
      'skills', coalesce((NEW.sections->>'skills')::boolean, true),
      'education', coalesce((NEW.sections->>'education')::boolean, true),
      'experience', coalesce((NEW.sections->>'experience')::boolean, true),
      'projects', coalesce((NEW.sections->>'projects')::boolean, true),
      'location', coalesce((NEW.sections->>'location')::boolean, true),
      'website', coalesce((NEW.sections->>'website')::boolean, true)
    );

    NEW.snapshot := public.tf_build_public_snapshot(NEW.user_id, NEW.sections);
    IF NEW.snapshot IS NULL THEN
      RAISE EXCEPTION 'Sila lengkapkan profil sebelum terbit.'
        USING ERRCODE = '23514';
    END IF;

    -- Do not invent career availability claims on behalf of the owner.
    NEW.snapshot := NEW.snapshot ||
      jsonb_build_object('open_to_opportunities', NEW.open_to_opportunities);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_portfolio_v2(
  p_slug text,
  p_template text,
  p_sections jsonb DEFAULT '{}'::jsonb,
  p_noindex boolean DEFAULT false,
  p_open_to_opportunities boolean DEFAULT false
)
RETURNS TABLE (slug text, template text, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE actor uuid := (SELECT auth.uid());
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Sila log masuk terlebih dahulu.' USING ERRCODE = '42501';
  END IF;

  -- Reuse slug, ownership and template validation from 0010.
  PERFORM public.publish_portfolio(p_slug, p_template, p_sections);

  UPDATE public.portfolio_publications AS publication
     SET noindex = coalesce(p_noindex, false),
         open_to_opportunities = coalesce(p_open_to_opportunities, false),
         published = true,
         updated_at = now()
   WHERE publication.user_id = actor
   RETURNING publication.slug, publication.template, publication.updated_at
     INTO slug, template, updated_at;

  IF slug IS NULL THEN
    RAISE EXCEPTION 'Penerbitan portfolio gagal.' USING ERRCODE = '42501';
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_portfolio_v2(text,text,jsonb,boolean,boolean)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_portfolio_v2(text,text,jsonb,boolean,boolean)
  TO authenticated;

-- Exact single-slug access, including SEO preference but not email or user_id.
CREATE OR REPLACE FUNCTION public.get_published_portfolio_seo(p_slug text)
RETURNS TABLE (
  slug text,
  template text,
  snapshot jsonb,
  noindex boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
 SELECT p.slug, p.template, p.snapshot, p.noindex, p.updated_at
   FROM public.portfolio_publications p
  WHERE p.published = true
    AND p.slug = p_slug
    AND length(p_slug) BETWEEN 3 AND 48
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_published_portfolio_seo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_portfolio_seo(text) TO anon, authenticated;

COMMIT;

````

## 2. `lib/portfolio-publishing.ts`

````ts
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

````

## 3. `lib/career-targets.ts`

````ts
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

````

## 4. `lib/skill-match.ts`

````ts
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

````

## 5. `data/career-targets.json`

````json
[
  {
    "id": "fullstack",
    "title": "Full Stack Developer",
    "skills": [
      {
        "name": "Web Development",
        "target": 5,
        "aliases": [
          "web development",
          "frontend",
          "backend",
          "full stack",
          "next.js"
        ]
      },
      {
        "name": "JavaScript",
        "target": 4,
        "aliases": [
          "javascript",
          "typescript",
          "node.js"
        ]
      },
      {
        "name": "React",
        "target": 4,
        "aliases": [
          "react",
          "reactjs",
          "react.js"
        ]
      },
      {
        "name": "Database",
        "target": 4,
        "aliases": [
          "sql",
          "postgresql",
          "mysql",
          "mongodb",
          "database",
          "supabase"
        ]
      },
      {
        "name": "Git",
        "target": 4,
        "aliases": [
          "git",
          "github",
          "gitlab"
        ]
      }
    ]
  },
  {
    "id": "cloud",
    "title": "Cloud Engineer",
    "skills": [
      {
        "name": "Cloud Computing",
        "target": 5,
        "aliases": [
          "cloud computing",
          "aws",
          "azure",
          "gcp",
          "proxmox"
        ]
      },
      {
        "name": "Linux",
        "target": 5,
        "aliases": [
          "linux",
          "ubuntu",
          "debian"
        ]
      },
      {
        "name": "Networking",
        "target": 4,
        "aliases": [
          "networking",
          "network administration",
          "tcp/ip"
        ]
      },
      {
        "name": "Docker",
        "target": 4,
        "aliases": [
          "docker",
          "containerization",
          "kubernetes"
        ]
      },
      {
        "name": "Security",
        "target": 4,
        "aliases": [
          "cybersecurity",
          "cloud security",
          "firewall",
          "zero trust"
        ]
      }
    ]
  },
  {
    "id": "data",
    "title": "Data Analyst",
    "skills": [
      {
        "name": "SQL",
        "target": 4,
        "aliases": [
          "sql",
          "postgresql",
          "mysql",
          "t-sql"
        ]
      },
      {
        "name": "Python",
        "target": 4,
        "aliases": [
          "python",
          "pandas"
        ]
      },
      {
        "name": "Data Analysis",
        "target": 5,
        "aliases": [
          "data analysis",
          "analytics",
          "data analyst"
        ]
      },
      {
        "name": "Statistics",
        "target": 4,
        "aliases": [
          "statistics",
          "statistical analysis"
        ]
      },
      {
        "name": "Data Visualization",
        "target": 4,
        "aliases": [
          "power bi",
          "tableau",
          "dashboard",
          "data visualization"
        ]
      }
    ]
  },
  {
    "id": "uiux",
    "title": "UI/UX Designer",
    "skills": [
      {
        "name": "UI Design",
        "target": 5,
        "aliases": [
          "ui design",
          "interface design",
          "figma"
        ]
      },
      {
        "name": "UX Research",
        "target": 4,
        "aliases": [
          "ux research",
          "user research",
          "usability testing"
        ]
      },
      {
        "name": "Prototyping",
        "target": 4,
        "aliases": [
          "prototyping",
          "wireframing"
        ]
      },
      {
        "name": "Design Systems",
        "target": 4,
        "aliases": [
          "design systems",
          "component library"
        ]
      },
      {
        "name": "Accessibility",
        "target": 4,
        "aliases": [
          "accessibility",
          "wcag",
          "inclusive design"
        ]
      }
    ]
  },
  {
    "id": "devops",
    "title": "DevOps Engineer",
    "skills": [
      {
        "name": "Linux",
        "target": 5,
        "aliases": [
          "linux",
          "ubuntu",
          "debian"
        ]
      },
      {
        "name": "CI/CD",
        "target": 4,
        "aliases": [
          "ci/cd",
          "github actions",
          "gitlab ci",
          "jenkins"
        ]
      },
      {
        "name": "Infrastructure as Code",
        "target": 4,
        "aliases": [
          "terraform",
          "ansible",
          "infrastructure as code"
        ]
      },
      {
        "name": "Containers",
        "target": 4,
        "aliases": [
          "docker",
          "kubernetes",
          "containerization"
        ]
      },
      {
        "name": "Monitoring",
        "target": 4,
        "aliases": [
          "prometheus",
          "grafana",
          "monitoring"
        ]
      }
    ]
  },
  {
    "id": "cybersecurity",
    "title": "Cybersecurity Analyst",
    "skills": [
      {
        "name": "Network Security",
        "target": 5,
        "aliases": [
          "network security",
          "firewall",
          "ids",
          "ips"
        ]
      },
      {
        "name": "Threat Analysis",
        "target": 4,
        "aliases": [
          "threat analysis",
          "incident response",
          "soc"
        ]
      },
      {
        "name": "Linux",
        "target": 4,
        "aliases": [
          "linux",
          "ubuntu"
        ]
      },
      {
        "name": "Security Testing",
        "target": 4,
        "aliases": [
          "pentesting",
          "penetration testing",
          "vulnerability assessment"
        ]
      },
      {
        "name": "Risk Management",
        "target": 4,
        "aliases": [
          "risk management",
          "compliance",
          "iso 27001"
        ]
      }
    ]
  }
]

````

## 6. `components/confirm-dialog.tsx`

````tsx
"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Accessible confirmation dialog for security-sensitive publish and delete
 * operations. Traps focus and restores the previously active control.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  danger = false,
  busy = false,
  children,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }

      if (event.key !== "Tab" || !dialog.current) return;

      const focusables = Array.from(
        dialog.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="tf-dialog-backdrop">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tf-dialog-title"
        aria-describedby="tf-dialog-description"
        className="tf-dialog-panel"
      >
        <div className="tf-dialog-heading">
          <span className={danger ? "tf-dialog-icon danger" : "tf-dialog-icon"}>
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <button
            type="button"
            className="tf-dialog-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="tf-dialog-title">{title}</h2>
        <p id="tf-dialog-description">{description}</p>
        {children}
        <div className="tf-dialog-actions">
          <button
            type="button"
            className="tf-btn tf-btn-outline"
            ref={cancel}
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? "tf-btn tf-dialog-danger-button" : "tf-btn"}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

````

## 7. `app/api/portfolio/publish/route.ts`

````ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { validPortfolioSlug } from "@/lib/portfolio-publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublishRequest = {
  action: "publish" | "unpublish";
  slug?: string;
  template?: string;
  sections?: Record<string, boolean>;
  noindex?: boolean;
  openToOpportunities?: boolean;
};

function response(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return response("Asal permintaan tidak dibenarkan.", 403);
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return response("Sila log masuk terlebih dahulu.", 401);
  }

  let input: PublishRequest;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 4096) {
      return response("Permintaan terlalu besar.", 413);
    }
    input = JSON.parse(raw) as PublishRequest;
  } catch {
    return response("Format input tidak sah.", 400);
  }

  if (input.action !== "publish" && input.action !== "unpublish") {
    return response("Operasi penerbitan tidak sah.", 400);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return response("Konfigurasi database tidak tersedia.", 503);
  }

  const token = authorization.slice(7);
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser(token);
  const user = data.user;

  if (error || !user) {
    return response("Sesi tidak sah atau telah tamat.", 401);
  }
  if (!user.email_confirmed_at) {
    return response("Sahkan e-mel sebelum menerbitkan portfolio.", 403);
  }

  const prior = await client
    .from("portfolio_publications")
    .select("slug,published")
    .eq("user_id", user.id)
    .maybeSingle();

  if (prior.error) return response("Gagal membaca status portfolio.", 500);
  const oldSlug = prior.data?.slug;

  if (input.action === "unpublish") {
    if (!prior.data?.published || !oldSlug) {
      return response("Tiada portfolio awam untuk dinyahterbitkan.", 404);
    }

    const result = await client
      .from("portfolio_publications")
      .update({ published: false })
      .eq("user_id", user.id);
    if (result.error) return response("Nyahterbit portfolio gagal.", 500);

    revalidatePath(`/u/${oldSlug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json(
      { ok: true, published: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let slug: string;
  try {
    slug = validPortfolioSlug(input.slug ?? "");
  } catch (exception) {
    return response(
      exception instanceof Error ? exception.message : "Slug tidak sah.",
      400,
    );
  }

  const theme = input.template ?? "";
  const allowedThemes = [
    "modern", "minimal", "tech", "amber", "neon",
    "crimson", "sunny", "student3d", "noirluxe",
  ];

  if (!allowedThemes.includes(theme)) {
    return response("Template tidak sah.", 400);
  }

  const sections = input.sections;
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return response("Pilihan seksyen tidak sah.", 400);
  }

  for (const key of [
    "skills", "education", "experience", "projects", "location", "website",
  ]) {
    if (typeof sections[key] !== "boolean") {
      return response(`Pilihan ${key} tidak sah.`, 400);
    }
  }

  const result = await client.rpc("publish_portfolio_v2", {
    p_slug: slug,
    p_template: theme,
    p_sections: sections,
    p_noindex: input.noindex === true,
    p_open_to_opportunities: input.openToOpportunities === true,
  });

  if (result.error) {
    if (result.error.code === "23505") {
      return response("Nama pautan sudah digunakan. Sila pilih nama lain.", 409);
    }
    return response("Portfolio tidak dapat diterbitkan: " + result.error.message, 400);
  }

  revalidatePath(`/u/${slug}`);
  if (oldSlug && oldSlug !== slug) revalidatePath(`/u/${oldSlug}`);
  revalidatePath("/sitemap.xml");

  return NextResponse.json(
    { ok: true, published: true, slug },
    { headers: { "Cache-Control": "no-store" } },
  );
}

````

## 8. `tests/phase2-core.test.mjs`

````javascript
import test from "node:test";
import assert from "node:assert/strict";
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

````

## 9. `package.json`

````json
{
  "name": "talent-portfolio-ai",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test:phase2": "node --experimental-strip-types --test tests/phase2-core.test.mjs",
    "prebuild": "npm run test:phase2"
  },
  "dependencies": {
    "next": "^15.5.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@supabase/supabase-js": "^2.57.0",
    "lucide-react": "^0.468.0",
    "@supabase/ssr": "0.12.7"
  },
  "devDependencies": {
    "typescript": "^5.9.2",
    "@types/node": "^22.18.0",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "tailwindcss": "^4.1.12",
    "@tailwindcss/postcss": "^4.1.12",
    "eslint": "^9.34.0",
    "eslint-config-next": "^15.5.0"
  },
  "engines": {
    "node": ">=22.16.0"
  }
}

````

## 10. `.nvmrc`

````text
22

````

