import locationsData from "@/data/locations.json";
import LocationGallery from "@/components/LocationGallery";

interface MapLocation {
  label: string;
  address: string;
  tel?: string;
  email?: string;
  /** Optional search query for the map embed; falls back to `address`. */
  query?: string;
  /** Which map service to embed. Defaults to Google Maps. */
  mapProvider?: "google" | "baidu";
  /** Headquarters photos shown next to the map. */
  images?: string[];
}

const locations = (locationsData.locations ?? []) as MapLocation[];

function embedUrl(loc: MapLocation) {
  const q = loc.query ?? loc.address;
  if (loc.mapProvider === "baidu") {
    // 바이두는 Google의 output=embed 같은 무료 임베드 API가 없어, 키 없이 쓸 수 있는
    // 공개 지도 검색 페이지(map.baidu.com)를 그대로 iframe에 넣는 방식 사용.
    return `https://map.baidu.com/search/${encodeURIComponent(q)}`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
}

export default function LocationMap() {
  if (locations.length === 0) return null;

  return (
    <div className="space-y-12">
      {locations.map((loc) => (
        <div key={loc.label}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-[#c9a84c] rounded" />
            <h2 className="text-xl font-bold text-(--brand)">{loc.label}</h2>
          </div>

          <div className="pl-4 space-y-1 mb-5 text-gray-600 leading-relaxed">
            <p>{loc.address}</p>
            {loc.tel && (
              <p>
                <span className="font-semibold text-(--brand)">Tel.</span> {loc.tel}
              </p>
            )}
            {loc.email && (
              <p>
                <span className="font-semibold text-(--brand)">Email.</span> {loc.email}
              </p>
            )}
          </div>

          <div className="pl-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden border border-gray-300 shadow-md">
              <iframe
                src={embedUrl(loc)}
                title={`Map — ${loc.label}`}
                className="w-full h-80 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            {loc.images && loc.images.length > 0 ? (
              <LocationGallery images={loc.images} alt={loc.label} />
            ) : (
              // ponytail: 사진 넣는 칸 — data/locations.json의 해당 지점에 "images" 배열 추가하면 갤러리로 표시됨
              <div className="rounded-xl overflow-hidden border border-gray-300 shadow-md bg-gray-100 h-80 flex items-center justify-center text-gray-400">
                사진
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
