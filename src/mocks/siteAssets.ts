import type { SiteAssets } from "@/src/lib/types";

// MySQL future table: site_assets
//
// Key/value catalog of site-wide images. Admin CRUD will manage rows here.
// In MySQL this becomes a (key, value) table queried by key — the strongly-
// typed `SiteAssets` shape stays the contract on the consumer side.
export const siteAssets: SiteAssets = {
  default_hero_image:
    "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1400&q=80&auto=format&fit=crop",
  hero_video: "",
};
