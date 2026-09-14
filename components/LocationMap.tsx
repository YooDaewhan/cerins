import locationsData from "@/data/locations.json";
import LocationGallery from "@/components/LocationGallery";
import DeferredMapFrame from "@/components/DeferredMapFrame";
import type { LocaleCode } from "@/src/lib/types";

interface MapLocation {
  label: string;
  address: string;
  tel?: string;
  email?: string;
  /** Optional search query for the map embed; falls back to `address`. */
  query?: string;
  /** Chinese-language query for Baidu Maps — its geocoder doesn't resolve romanized/English addresses. */
  baiduQuery?: string;
  /**
   * Exact iframe URL captured from a live map.baidu.com search (address bar after searching
   * `baiduQuery`). Baidu's `/search/<query>` path alone doesn't reliably trigger the search —
   * it needs `querytype=s`, `wd=`, city code, and viewport params that only a real search run produces.
   */
  baiduEmbedUrl?: string;
  /** Which map service to embed. Defaults to Google Maps. */
  mapProvider?: "google" | "baidu";
  /** Headquarters photos shown next to the map. */
  images?: string[];
}

const locations = (locationsData.locations ?? []) as MapLocation[];

// 지점명(도시·국가)과 캡션만 언어별. 주소/전화/이메일은 공통. LABELS 순서는 locations 순서와 일치.
const LABELS: Record<LocaleCode, string[]> = {
  ko: ["본사 · 서울, 대한민국", "모스크바, 러시아", "알마티, 카자흐스탄", "구자라트, 인도", "호치민, 베트남", "상하이, 중국", "타슈켄트, 우즈베키스탄"],
  en: ["Head Office · Seoul, Korea", "Moscow, Russia", "Almaty, Kazakhstan", "Gujarat, India", "Ho Chi Minh City, Vietnam", "Shanghai, China", "Tashkent, Uzbekistan"],
  ja: ["本社 · ソウル, 韓国", "モスクワ, ロシア", "アルマトイ, カザフスタン", "グジャラート, インド", "ホーチミン, ベトナム", "上海, 中国", "タシケント, ウズベキスタン"],
  zh: ["总部 · 首尔, 韩国", "莫斯科, 俄罗斯", "阿拉木图, 哈萨克斯坦", "古吉拉特, 印度", "胡志明市, 越南", "上海, 中国", "塔什干, 乌兹别克斯坦"],
  ru: ["Головной офис · Сеул, Корея", "Москва, Россия", "Алматы, Казахстан", "Гуджарат, Индия", "Хошимин, Вьетнам", "Шанхай, Китай", "Ташкент, Узбекистан"],
  kk: ["Бас кеңсе · Сеул, Корея", "Мәскеу, Ресей", "Алматы, Қазақстан", "Гуджарат, Үндістан", "Хошимин, Вьетнам", "Шанхай, Қытай", "Ташкент, Өзбекстан"],
  vi: ["Trụ sở chính · Seoul, Hàn Quốc", "Moscow, Nga", "Almaty, Kazakhstan", "Gujarat, Ấn Độ", "TP. Hồ Chí Minh, Việt Nam", "Thượng Hải, Trung Quốc", "Tashkent, Uzbekistan"],
};

const CAPTIONS: Record<
  LocaleCode,
  { tel: string; email: string; photo: string; showMap: string }
> = {
  ko: { tel: "전화", email: "이메일", photo: "사진", showMap: "지도 보기" },
  en: { tel: "Tel.", email: "Email", photo: "Photo", showMap: "Show map" },
  ja: { tel: "電話", email: "メール", photo: "写真", showMap: "地図を表示" },
  zh: { tel: "电话", email: "邮箱", photo: "照片", showMap: "显示地图" },
  ru: { tel: "Тел.", email: "Эл. почта", photo: "Фото", showMap: "Показать карту" },
  kk: { tel: "Тел.", email: "Email", photo: "Сурет", showMap: "Картаны көрсету" },
  vi: { tel: "ĐT.", email: "Email", photo: "Ảnh", showMap: "Xem bản đồ" },
};

function embedUrl(loc: MapLocation) {
  if (loc.mapProvider === "baidu") {
    if (loc.baiduEmbedUrl) return loc.baiduEmbedUrl;
    const q = loc.baiduQuery ?? loc.query ?? loc.address;
    return `https://map.baidu.com/search/${encodeURIComponent(q)}`;
  }
  const q = loc.query ?? loc.address;
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
}

export default function LocationMap({ locale }: { locale: LocaleCode }) {
  if (locations.length === 0) return null;
  const labels = LABELS[locale];
  const cap = CAPTIONS[locale];

  return (
    <div className="space-y-12">
      {locations.map((loc, i) => (
        <div key={i}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-[#c9a84c] rounded" />
            <h2 className="text-xl font-bold text-(--brand)">{labels[i] ?? loc.label}</h2>
          </div>

          <div className="pl-4 space-y-1 mb-5 text-gray-600 leading-relaxed">
            <p>{loc.address}</p>
            {loc.tel && (
              <p>
                <span className="font-semibold text-(--brand)">{cap.tel}</span> {loc.tel}
              </p>
            )}
            {loc.email && (
              <p>
                <span className="font-semibold text-(--brand)">{cap.email}</span> {loc.email}
              </p>
            )}
          </div>

          <div className="pl-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden border border-gray-300 shadow-md">
              {loc.mapProvider === "baidu" ? (
                <DeferredMapFrame
                  src={embedUrl(loc)}
                  title={`Map — ${loc.label}`}
                  label={cap.showMap}
                />
              ) : (
                <iframe
                  src={embedUrl(loc)}
                  title={`Map — ${loc.label}`}
                  className="w-full h-80 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              )}
            </div>
            {loc.images && loc.images.length > 0 ? (
              <LocationGallery images={loc.images} alt={loc.label} />
            ) : (
              // ponytail: 사진 넣는 칸 — data/locations.json의 해당 지점에 "images" 배열 추가하면 갤러리로 표시됨
              <div className="rounded-xl overflow-hidden border border-gray-300 shadow-md bg-gray-100 h-80 flex items-center justify-center text-gray-400">
                {cap.photo}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
