import type { Partner } from "@/src/lib/types";

// MySQL future table: partners
export const partners: Partner[] = [
  { id: 1, name: "Bureau Veritas",  logo: "/images/partners/bv.png",       sort_order: 1, is_visible: true },
  { id: 2, name: "SGS Group",       logo: "/images/partners/sgs.png",      sort_order: 2, is_visible: true },
  { id: 3, name: "TÜV Rheinland",   logo: "/images/partners/tuv.png",      sort_order: 3, is_visible: true },
  { id: 4, name: "Intertek",        logo: "/images/partners/intertek.png", sort_order: 4, is_visible: true },
  { id: 5, name: "Lloyd's Register", logo: "/images/partners/lloyds.png",  sort_order: 5, is_visible: true },
  { id: 6, name: "DNV GL",          logo: "/images/partners/dnv.png",      sort_order: 6, is_visible: true },
  { id: 7, name: "DEKRA",           logo: "/images/partners/dekra.png",    sort_order: 7, is_visible: true },
  { id: 8, name: "Eurofins",        logo: "/images/partners/eurofins.png", sort_order: 8, is_visible: true },
];
