import type { MenuTranslation } from "@/src/lib/types";

const NOW = "2026-01-01T00:00:00Z";

// MySQL future table: menu_translations
export const menuTranslations: MenuTranslation[] = [
  // Top-level
  { id: 1,  menu_id: 100, locale: "en", label: "About",         created_at: NOW, updated_at: NOW },
  { id: 2,  menu_id: 200, locale: "en", label: "Certification", created_at: NOW, updated_at: NOW },
  { id: 3,  menu_id: 300, locale: "en", label: "Inspection",    created_at: NOW, updated_at: NOW },
  { id: 4,  menu_id: 400, locale: "en", label: "Contact",       created_at: NOW, updated_at: NOW },
  { id: 5,  menu_id: 500, locale: "en", label: "News",          created_at: NOW, updated_at: NOW },

  // About children
  { id: 10, menu_id: 110, locale: "en", label: "About CERINS",                       created_at: NOW, updated_at: NOW },
  { id: 11, menu_id: 111, locale: "en", label: "Vision",                             created_at: NOW, updated_at: NOW },
  { id: 12, menu_id: 112, locale: "en", label: "Business Ethics and Compliance",     created_at: NOW, updated_at: NOW },
  { id: 13, menu_id: 113, locale: "en", label: "Certification and Accreditations",   created_at: NOW, updated_at: NOW },
  { id: 14, menu_id: 114, locale: "en", label: "Location",                           created_at: NOW, updated_at: NOW },

  // Certification children
  { id: 20, menu_id: 210, locale: "en", label: "Russia",       created_at: NOW, updated_at: NOW },
  { id: 21, menu_id: 211, locale: "en", label: "Kazakhstan",   created_at: NOW, updated_at: NOW },
  { id: 22, menu_id: 212, locale: "en", label: "Belarus",      created_at: NOW, updated_at: NOW },
  { id: 23, menu_id: 213, locale: "en", label: "Uzbekistan",   created_at: NOW, updated_at: NOW },
  { id: 24, menu_id: 214, locale: "en", label: "Ukraine",      created_at: NOW, updated_at: NOW },
  { id: 25, menu_id: 215, locale: "en", label: "Turkmenistan", created_at: NOW, updated_at: NOW },
  { id: 26, menu_id: 216, locale: "en", label: "Azerbaijan",   created_at: NOW, updated_at: NOW },
  { id: 27, menu_id: 217, locale: "en", label: "Vietnam",      created_at: NOW, updated_at: NOW },
  { id: 28, menu_id: 218, locale: "en", label: "Europe",       created_at: NOW, updated_at: NOW },

  // Inspection children
  { id: 30, menu_id: 310, locale: "en", label: "Pre-Shipment Inspection", created_at: NOW, updated_at: NOW },
  { id: 31, menu_id: 311, locale: "en", label: "India VOC",               created_at: NOW, updated_at: NOW },
  { id: 32, menu_id: 312, locale: "en", label: "NDT",                     created_at: NOW, updated_at: NOW },
  { id: 33, menu_id: 313, locale: "en", label: "General Inspection",      created_at: NOW, updated_at: NOW },
  { id: 34, menu_id: 314, locale: "en", label: "Other Services",          created_at: NOW, updated_at: NOW },

  // Top-level
  { id: 101, menu_id: 100, locale: "ko", label: "소개",        created_at: NOW, updated_at: NOW },
  { id: 102, menu_id: 200, locale: "ko", label: "인증",        created_at: NOW, updated_at: NOW },
  { id: 103, menu_id: 300, locale: "ko", label: "검사",        created_at: NOW, updated_at: NOW },
  { id: 104, menu_id: 400, locale: "ko", label: "문의",        created_at: NOW, updated_at: NOW },
  { id: 105, menu_id: 500, locale: "ko", label: "뉴스",        created_at: NOW, updated_at: NOW },

  // About children
  { id: 110, menu_id: 110, locale: "ko", label: "CERINS 소개",       created_at: NOW, updated_at: NOW },
  { id: 111, menu_id: 111, locale: "ko", label: "비전",              created_at: NOW, updated_at: NOW },
  { id: 112, menu_id: 112, locale: "ko", label: "기업 윤리 및 컴플라이언스", created_at: NOW, updated_at: NOW },
  { id: 113, menu_id: 113, locale: "ko", label: "인증 및 인정",       created_at: NOW, updated_at: NOW },
  { id: 114, menu_id: 114, locale: "ko", label: "오시는 길",         created_at: NOW, updated_at: NOW },

  // Certification children
  { id: 120, menu_id: 210, locale: "ko", label: "러시아",        created_at: NOW, updated_at: NOW },
  { id: 121, menu_id: 211, locale: "ko", label: "카자흐스탄",    created_at: NOW, updated_at: NOW },
  { id: 122, menu_id: 212, locale: "ko", label: "벨라루스",      created_at: NOW, updated_at: NOW },
  { id: 123, menu_id: 213, locale: "ko", label: "우즈베키스탄",  created_at: NOW, updated_at: NOW },
  { id: 124, menu_id: 214, locale: "ko", label: "우크라이나",    created_at: NOW, updated_at: NOW },
  { id: 125, menu_id: 215, locale: "ko", label: "투르크메니스탄", created_at: NOW, updated_at: NOW },
  { id: 126, menu_id: 216, locale: "ko", label: "아제르바이잔",  created_at: NOW, updated_at: NOW },
  { id: 127, menu_id: 217, locale: "ko", label: "베트남",        created_at: NOW, updated_at: NOW },
  { id: 128, menu_id: 218, locale: "ko", label: "유럽",          created_at: NOW, updated_at: NOW },

  // Inspection children
  { id: 130, menu_id: 310, locale: "ko", label: "선적 전 검사", created_at: NOW, updated_at: NOW },
  { id: 131, menu_id: 311, locale: "ko", label: "인도 VOC",     created_at: NOW, updated_at: NOW },
  { id: 132, menu_id: 312, locale: "ko", label: "비파괴 검사",  created_at: NOW, updated_at: NOW },
  { id: 133, menu_id: 313, locale: "ko", label: "일반 검사",    created_at: NOW, updated_at: NOW },
  { id: 134, menu_id: 314, locale: "ko", label: "기타 서비스",  created_at: NOW, updated_at: NOW },
];
