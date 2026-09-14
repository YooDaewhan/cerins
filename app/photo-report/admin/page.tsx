import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/src/lib/auth";
import { listPhotoReports, PAGE_SIZE } from "@/src/lib/photoReports";
import { REPORTS } from "@/src/lib/reportForms";

export const metadata: Metadata = {
  title: "사진보고서 보관함 - CERINS",
};

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  ...Object.fromEntries(REPORTS.map((r) => [r.id, r.title])),
  upload: "직접 업로드",
};

const COLUMNS = [
  { key: "created", label: "생성일시" },
  { key: "type", label: "종류" },
  { key: "name", label: "파일" },
  { key: "size", label: "크기" },
] as const;

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface Props {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; page?: string }>;
}

export default async function PhotoReportAdminPage({ searchParams }: Props) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const sp = await searchParams;
  const q = sp.q ?? "";
  const sort = sp.sort ?? "created";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const { items, total, page, pages } = await listPhotoReports({
    q,
    sort,
    dir,
    page: Number(sp.page) || 1,
  });

  // 현재 조건을 유지한 채 일부만 바꾼 링크를 만든다.
  const linkTo = (patch: Record<string, string | number>) => {
    const params = new URLSearchParams({ q, sort, dir, page: String(page) });
    for (const [k, v] of Object.entries(patch)) params.set(k, String(v));
    if (!params.get("q")) params.delete("q");
    return `/photo-report/admin?${params}`;
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-5xl mx-auto p-6 sm:p-8 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">사진보고서 보관함</h1>
            <p className="mt-1 text-sm text-gray-500">
              생성된 Word/zip 파일이 서버에 보관됩니다. 총 {total}건.
            </p>
          </div>
          <Link
            href="/photo-report"
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            보고서 만들기
          </Link>
        </div>

        {/* 검색: GET 폼이라 URL 만으로 상태가 유지된다. */}
        <form method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="파일명 또는 종류로 검색"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            검색
          </button>
          {q && (
            <Link
              href="/photo-report/admin"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              초기화
            </Link>
          )}
        </form>

        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            {q ? "검색 결과가 없습니다." : "보관된 보고서가 없습니다."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500">
                    {COLUMNS.map((c) => (
                      <th key={c.key} className="py-2 pr-3">
                        <Link
                          href={linkTo({
                            sort: c.key,
                            dir: sort === c.key && dir === "desc" ? "asc" : "desc",
                            page: 1,
                          })}
                          className="hover:text-gray-700"
                        >
                          {c.label}
                          {sort === c.key && (dir === "asc" ? " ▲" : " ▼")}
                        </Link>
                      </th>
                    ))}
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-500">{r.created_at}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-700">
                        {LABELS[r.report_type] ?? r.report_type}
                      </td>
                      <td className="py-2 pr-3 text-gray-700 break-all">{r.original_name}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-500">
                        {formatSize(r.file_size)}
                      </td>
                      <td className="py-2 text-right">
                        <a
                          href={`/api/photo-report/files/${r.id}`}
                          className="inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          다운로드
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-2">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={linkTo({ page: p })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      p === page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            )}
            <p className="text-center text-xs text-gray-400">
              {page} / {pages} 페이지 · {PAGE_SIZE}개씩
            </p>
          </>
        )}
      </div>
    </main>
  );
}
