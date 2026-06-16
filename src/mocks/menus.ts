import type { Menu } from "@/src/lib/types";

const NOW = "2026-01-01T00:00:00Z";

// MySQL future table: menus
//
// `mega_image_url` is the background image shown in the desktop mega-menu
// panel. Only top-level menus that have children use it; leaf menus keep null.

const ABOUT_MEGA =
  "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1400&q=80&auto=format&fit=crop";
const CERT_MEGA =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80&auto=format&fit=crop";
const INSP_MEGA =
  "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1400&q=80&auto=format&fit=crop";

export const menus: Menu[] = [
  // Top-level
  { id: 100, parent_id: null, page_id: 2, url: null, mega_image_url: ABOUT_MEGA, sort_order: 10, is_visible: true, created_at: NOW, updated_at: NOW }, // About
  { id: 200, parent_id: null, page_id: 3, url: null, mega_image_url: CERT_MEGA,  sort_order: 20, is_visible: true, created_at: NOW, updated_at: NOW }, // Certification
  { id: 300, parent_id: null, page_id: 4, url: null, mega_image_url: INSP_MEGA,  sort_order: 30, is_visible: true, created_at: NOW, updated_at: NOW }, // Inspection
  { id: 400, parent_id: null, page_id: 5, url: null, mega_image_url: null,        sort_order: 40, is_visible: true, created_at: NOW, updated_at: NOW }, // Contact
  { id: 500, parent_id: null, page_id: 6, url: null, mega_image_url: null,        sort_order: 50, is_visible: true, created_at: NOW, updated_at: NOW }, // News

  // About children
  { id: 110, parent_id: 100, page_id: 10, url: null, mega_image_url: null, sort_order: 11, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 111, parent_id: 100, page_id: 11, url: null, mega_image_url: null, sort_order: 12, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 112, parent_id: 100, page_id: 12, url: null, mega_image_url: null, sort_order: 13, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 113, parent_id: 100, page_id: 13, url: null, mega_image_url: null, sort_order: 14, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 114, parent_id: 100, page_id: 14, url: null, mega_image_url: null, sort_order: 15, is_visible: true, created_at: NOW, updated_at: NOW },

  // Certification children
  { id: 210, parent_id: 200, page_id: 20, url: null, mega_image_url: null, sort_order: 21, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 211, parent_id: 200, page_id: 21, url: null, mega_image_url: null, sort_order: 22, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 212, parent_id: 200, page_id: 22, url: null, mega_image_url: null, sort_order: 23, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 213, parent_id: 200, page_id: 23, url: null, mega_image_url: null, sort_order: 24, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 214, parent_id: 200, page_id: 24, url: null, mega_image_url: null, sort_order: 25, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 215, parent_id: 200, page_id: 25, url: null, mega_image_url: null, sort_order: 26, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 216, parent_id: 200, page_id: 26, url: null, mega_image_url: null, sort_order: 27, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 217, parent_id: 200, page_id: 27, url: null, mega_image_url: null, sort_order: 28, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 218, parent_id: 200, page_id: 28, url: null, mega_image_url: null, sort_order: 29, is_visible: true, created_at: NOW, updated_at: NOW },

  // Inspection children
  { id: 310, parent_id: 300, page_id: 30, url: null, mega_image_url: null, sort_order: 31, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 311, parent_id: 300, page_id: 31, url: null, mega_image_url: null, sort_order: 32, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 312, parent_id: 300, page_id: 32, url: null, mega_image_url: null, sort_order: 33, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 313, parent_id: 300, page_id: 33, url: null, mega_image_url: null, sort_order: 34, is_visible: true, created_at: NOW, updated_at: NOW },
  { id: 314, parent_id: 300, page_id: 34, url: null, mega_image_url: null, sort_order: 35, is_visible: true, created_at: NOW, updated_at: NOW },
];
