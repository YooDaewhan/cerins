import type { Menu } from "@/src/lib/types";

const NOW = "2026-01-01T00:00:00Z";

// MySQL future table: menus
//
// `page_id` links to a row in `pages` when the menu item points to a CMS-
// managed page. `url` is used when the link is a section root that doesn't
// have its own detail page (kept null for now since all roots also have
// matching `pages` rows).
//
// Top-level: About (10), Certification (20), Inspection (30), Contact (40), News (50).
// Sub-menus live under the appropriate parent_id.
export const menus: Menu[] = [
  // Top-level
  { id: 100, parent_id: null, page_id: 2, url: null, sort_order: 10, is_visible: true, created_at: NOW, updated_at: NOW }, // About
  { id: 200, parent_id: null, page_id: 3, url: null, sort_order: 20, is_visible: true, created_at: NOW, updated_at: NOW }, // Certification
  { id: 300, parent_id: null, page_id: 4, url: null, sort_order: 30, is_visible: true, created_at: NOW, updated_at: NOW }, // Inspection
  { id: 400, parent_id: null, page_id: 5, url: null, sort_order: 40, is_visible: true, created_at: NOW, updated_at: NOW }, // Contact
  { id: 500, parent_id: null, page_id: 6, url: null, sort_order: 50, is_visible: true, created_at: NOW, updated_at: NOW }, // News

  // About children
  { id: 110, parent_id: 100, page_id: 10, url: null, sort_order: 11, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 111, parent_id: 100, page_id: 11, url: null, sort_order: 12, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 112, parent_id: 100, page_id: 12, url: null, sort_order: 13, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 113, parent_id: 100, page_id: 13, url: null, sort_order: 14, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 114, parent_id: 100, page_id: 14, url: null, sort_order: 15, is_visible: true, created_at: NOW, updated_at: NOW },

  // Certification children
  { id: 210, parent_id: 200, page_id: 20, url: null, sort_order: 21, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 211, parent_id: 200, page_id: 21, url: null, sort_order: 22, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 212, parent_id: 200, page_id: 22, url: null, sort_order: 23, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 213, parent_id: 200, page_id: 23, url: null, sort_order: 24, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 214, parent_id: 200, page_id: 24, url: null, sort_order: 25, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 215, parent_id: 200, page_id: 25, url: null, sort_order: 26, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 216, parent_id: 200, page_id: 26, url: null, sort_order: 27, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 217, parent_id: 200, page_id: 27, url: null, sort_order: 28, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 218, parent_id: 200, page_id: 28, url: null, sort_order: 29, is_visible: true, created_at: NOW, updated_at: NOW },

  // Inspection children
  { id: 310, parent_id: 300, page_id: 30, url: null, sort_order: 31, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 311, parent_id: 300, page_id: 31, url: null, sort_order: 32, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 312, parent_id: 300, page_id: 32, url: null, sort_order: 33, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 313, parent_id: 300, page_id: 33, url: null, sort_order: 34, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 314, parent_id: 300, page_id: 34, url: null, sort_order: 35, is_visible: true, created_at: NOW, updated_at: NOW },
];
