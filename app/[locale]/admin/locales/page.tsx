import type { Metadata } from "next";
import LocalesAdminClient from "./LocalesAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 언어 - CERINS",
};

export const dynamic = "force-dynamic";

export default function AdminLocalesPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">언어 관리</h2>
      <p className="text-xs text-gray-500 mb-4">
        여기서 추가/삭제한 언어는 메뉴·페이지·뉴스·슬라이드의 '언어별 라벨' 입력 행에 즉시 반영됩니다.
        번역이 존재하는 언어는 삭제할 수 없습니다.
      </p>
      <LocalesAdminClient />
    </div>
  );
}
