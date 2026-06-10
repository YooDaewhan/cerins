export interface Partner {
  id: number;
  name: string;
  logo?: string;
  website?: string;
}

export const partners: Partner[] = [
  { id: 1, name: "Bureau Veritas", logo: "/images/partners/bv.png" },
  { id: 2, name: "SGS Group", logo: "/images/partners/sgs.png" },
  { id: 3, name: "TÜV Rheinland", logo: "/images/partners/tuv.png" },
  { id: 4, name: "Intertek", logo: "/images/partners/intertek.png" },
  { id: 5, name: "Lloyd's Register", logo: "/images/partners/lloyds.png" },
  { id: 6, name: "DNV GL", logo: "/images/partners/dnv.png" },
  { id: 7, name: "DEKRA", logo: "/images/partners/dekra.png" },
  { id: 8, name: "Eurofins", logo: "/images/partners/eurofins.png" },
];
