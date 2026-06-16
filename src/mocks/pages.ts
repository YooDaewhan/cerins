import type { Page } from "@/src/lib/types";

const NOW = "2026-01-01T00:00:00Z";

// MySQL future table: pages
//
// `slug` is unique. Section-root pages use slugs like "about", "certification",
// "inspection", "contact", "news", "home". Detail pages use their leaf slug
// (e.g. "vision", "russia", "ndt"). The renderer chooses a layout based on
// `template`.
export const pages: Page[] = [
  // ── Section roots / standalone ─────────────────────────────────────────────
  { id: 1,  slug: "home",          template: "home",          is_published: true, sort_order: 1,  created_at: NOW, updated_at: NOW },
  { id: 2,  slug: "about",         template: "about",         is_published: true, sort_order: 10, created_at: NOW, updated_at: NOW },
  { id: 3,  slug: "certification", template: "certification", is_published: true, sort_order: 20, created_at: NOW, updated_at: NOW },
  { id: 4,  slug: "inspection",    template: "inspection",    is_published: true, sort_order: 30, created_at: NOW, updated_at: NOW },
  { id: 5,  slug: "contact",       template: "contact",       is_published: true, sort_order: 40, created_at: NOW, updated_at: NOW },
  { id: 6,  slug: "news",          template: "news_list",     is_published: true, sort_order: 50, created_at: NOW, updated_at: NOW },

  // ── About ──────────────────────────────────────────────────────────────────
  { id: 10, slug: "about-cerins",                       template: "about",         is_published: true, sort_order: 11, created_at: NOW, updated_at: NOW },
  { id: 11, slug: "vision",                             template: "about",         is_published: true, sort_order: 12, created_at: NOW, updated_at: NOW },
  { id: 12, slug: "business-ethics-and-compliance",     template: "about",         is_published: true, sort_order: 13, created_at: NOW, updated_at: NOW },
  { id: 13, slug: "certification-and-accreditations",   template: "about",         is_published: true, sort_order: 14, created_at: NOW, updated_at: NOW },
  { id: 14, slug: "location",                           template: "about",         is_published: true, sort_order: 15, created_at: NOW, updated_at: NOW },

  // ── Certification ──────────────────────────────────────────────────────────
  { id: 20, slug: "russia",        template: "certification", is_published: true, sort_order: 21, created_at: NOW, updated_at: NOW },
  { id: 21, slug: "kazakhstan",    template: "certification", is_published: true, sort_order: 22, created_at: NOW, updated_at: NOW },
  { id: 22, slug: "belarus",       template: "certification", is_published: true, sort_order: 23, created_at: NOW, updated_at: NOW },
  { id: 23, slug: "uzbekistan",    template: "certification", is_published: true, sort_order: 24, created_at: NOW, updated_at: NOW },
  { id: 24, slug: "ukraine",       template: "certification", is_published: true, sort_order: 25, created_at: NOW, updated_at: NOW },
  { id: 25, slug: "turkmenistan",  template: "certification", is_published: true, sort_order: 26, created_at: NOW, updated_at: NOW },
  { id: 26, slug: "azerbaijan",    template: "certification", is_published: true, sort_order: 27, created_at: NOW, updated_at: NOW },
  { id: 27, slug: "vietnam",       template: "certification", is_published: true, sort_order: 28, created_at: NOW, updated_at: NOW },
  { id: 28, slug: "europe",        template: "certification", is_published: true, sort_order: 29, created_at: NOW, updated_at: NOW },

  // ── Inspection ─────────────────────────────────────────────────────────────
  { id: 30, slug: "pre-shipment-inspection", template: "inspection", is_published: true, sort_order: 31, created_at: NOW, updated_at: NOW },
  { id: 31, slug: "india-voc",               template: "inspection", is_published: true, sort_order: 32, created_at: NOW, updated_at: NOW },
  { id: 32, slug: "ndt",                     template: "inspection", is_published: true, sort_order: 33, created_at: NOW, updated_at: NOW },
  { id: 33, slug: "general-inspection",      template: "inspection", is_published: true, sort_order: 34, created_at: NOW, updated_at: NOW },
  { id: 34, slug: "other-services",          template: "inspection", is_published: true, sort_order: 35, created_at: NOW, updated_at: NOW },

  // ── Services ───────────────────────────────────────────────────────────────
  { id: 40, slug: "documentation",                       template: "services", is_published: true, sort_order: 41, created_at: NOW, updated_at: NOW },
  { id: 41, slug: "project-management-custom-brokerage", template: "services", is_published: true, sort_order: 42, created_at: NOW, updated_at: NOW },
];
