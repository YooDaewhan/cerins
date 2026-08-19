"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import type { LocaleCode } from "@/src/lib/types";

const BROCHURES = [
  { lang: "English", file: "/brochures/cerins-2025-en.pdf" },
  { lang: "中文", file: "/brochures/cerins-2025-zh.pdf" },
  { lang: "Tiếng Việt", file: "/brochures/cerins-2025-vi.pdf" },
] as const;

const T: Record<LocaleCode, { heading: string; sub: string; view: string; download: string; loading: string }> = {
  ko: { heading: "회사소개 브로슈어", sub: "CERINS 회사소개서 (2025)", view: "책자 보기", download: "PDF 내려받기", loading: "불러오는 중…" },
  en: { heading: "Company Brochure", sub: "CERINS Company Introduction (2025)", view: "Read", download: "Download PDF", loading: "Loading…" },
  ja: { heading: "会社案内パンフレット", sub: "CERINS 会社紹介 (2025)", view: "見る", download: "PDF ダウンロード", loading: "読み込み中…" },
  zh: { heading: "公司介绍手册", sub: "CERINS 公司介绍 (2025)", view: "阅读", download: "下载 PDF", loading: "加载中…" },
  ru: { heading: "Брошюра о компании", sub: "CERINS Company Introduction (2025)", view: "Смотреть", download: "Скачать PDF", loading: "Загрузка…" },
  kk: { heading: "Компания брошюрасы", sub: "CERINS Company Introduction (2025)", view: "Қарау", download: "PDF жүктеу", loading: "Жүктелуде…" },
  vi: { heading: "Hồ sơ năng lực công ty", sub: "CERINS Company Introduction (2025)", view: "Xem", download: "Tải PDF", loading: "Đang tải…" },
};

// ponytail: 페이지를 캔버스 -> dataURL 로 굽고, 오른쪽 장을 책등(spine) 축으로 rotateY 시켜 넘긴다.
// 넘어가는 장의 앞면 = 지금 오른쪽 쪽, 뒷면 = 새 왼쪽 쪽 — backface-visibility 로 90도에서 교대된다.
// 진짜 종이 휘어짐(page curl)은 별도 라이브러리가 필요 — 요구되면 그때.
async function loadPdf(url: string): Promise<PDFDocumentLoadingTask> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  return pdfjs.getDocument({
    url,
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
    wasmUrl: "/pdfjs/wasm/",
    iccUrl: "/pdfjs/iccs/",
    disableAutoFetch: true, // 340쪽짜리 중국어본을 통째로 받지 않도록
  });
}

async function renderPage(doc: PDFDocumentProxy, n: number): Promise<string> {
  const page = await doc.getPage(n);
  const unit = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(1600 / unit.width, 3) });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function BrochureFlipbook({ locale }: { locale: LocaleCode }) {
  const t = T[locale];
  const [open, setOpen] = useState<(typeof BROCHURES)[number] | null>(null);

  return (
    <section className="mt-14 pt-10 border-t border-gray-100">
      <h2 className="text-lg font-bold text-(--brand)">{t.heading}</h2>
      <p className="mt-1 text-sm text-gray-500">{t.sub}</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {BROCHURES.map((b) => (
          <button
            key={b.file}
            type="button"
            onClick={() => setOpen(b)}
            className="group text-left rounded-lg border border-gray-200 overflow-hidden hover:border-(--brand) hover:shadow-lg transition"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-(--brand) to-[#0d2a5a] flex flex-col items-center justify-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cerins_white.png" alt="CERINS" className="h-8 w-auto opacity-90" />
              <span className="text-white/70 text-[11px] tracking-[0.2em] uppercase">Company Introduction</span>
              <span className="text-white text-lg font-semibold">{b.lang}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600 group-hover:text-(--brand)">{t.view}</span>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-(--brand)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <Viewer file={open.file} title={`${t.sub} — ${open.lang}`} t={t} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}

/** 펼침면: 왼쪽/오른쪽 쪽 이미지 (없으면 백지) */
type Spread = { left: string | null; right: string | null };

const FLIP_MS = 620;

function Viewer({
  file,
  title,
  t,
  onClose,
}: {
  file: string;
  title: string;
  t: (typeof T)[LocaleCode];
  onClose: () => void;
}) {
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const cache = useRef(new Map<number, string>());
  const busy = useRef(false);
  const [total, setTotal] = useState(0);
  const [start, setStart] = useState(1); // 펼침면 왼쪽 쪽 번호 (1, 3, 5 …)
  const [aspect, setAspect] = useState(16 / 9); // 한 쪽의 가로/세로
  const [base, setBase] = useState<Spread | null>(null);
  const [flip, setFlip] = useState<{ front: string | null; back: string | null; dir: "next" | "prev" } | null>(null);

  const pageImage = useCallback(async (n: number) => {
    const doc = docRef.current;
    if (!doc || n < 1 || n > doc.numPages) return null;
    const hit = cache.current.get(n);
    if (hit) return hit;
    const img = await renderPage(doc, n);
    cache.current.set(n, img);
    return img;
  }, []);

  const spreadOf = useCallback(
    async (s: number): Promise<Spread> => {
      const [left, right] = await Promise.all([pageImage(s), pageImage(s + 1)]);
      return { left, right };
    },
    [pageImage],
  );

  useEffect(() => {
    let dead = false;
    void (async () => {
      const task = await loadPdf(file);
      taskRef.current = task;
      const doc = await task.promise;
      if (dead) {
        void task.destroy();
        return;
      }
      docRef.current = doc;
      setTotal(doc.numPages);
      const unit = (await doc.getPage(1)).getViewport({ scale: 1 });
      setAspect(unit.width / unit.height);
      setBase(await spreadOf(1));
    })();
    return () => {
      dead = true;
      void taskRef.current?.destroy();
      taskRef.current = null;
      docRef.current = null;
    };
  }, [file, spreadOf]);

  const go = useCallback(
    async (dir: "next" | "prev") => {
      const doc = docRef.current;
      if (!doc || busy.current || !base) return;
      const target = dir === "next" ? start + 2 : start - 2;
      if (target < 1 || target > doc.numPages) return;
      busy.current = true;
      const next = await spreadOf(target);
      setStart(target);
      if (dir === "next") {
        // 오른쪽 장이 책등을 축으로 왼쪽으로 넘어간다
        setBase({ left: base.left, right: next.right });
        setFlip({ front: base.right, back: next.left, dir });
      } else {
        // 왼쪽에 덮여 있던 장이 오른쪽으로 되넘어온다
        setBase({ left: next.left, right: base.right });
        setFlip({ front: next.right, back: base.left, dir });
      }
      setTimeout(() => {
        setBase(next);
        setFlip(null);
        busy.current = false;
      }, FLIP_MS);
      void spreadOf(dir === "next" ? target + 2 : target - 2).catch(() => {});
    },
    [base, start, spreadOf],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") void go("next");
      if (e.key === "ArrowLeft") void go("prev");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  const pageCls = "absolute inset-0 w-full h-full object-contain bg-white";
  // 슬라이드가 16:9라 펼치면 32:9 — 비율 고정이므로 폭 상한을 낮춰야 전체가 작아진다.
  const bookWidth = `min(92vw, 1180px, calc(70vh * ${(aspect * 2).toFixed(3)}))`;
  const canPrev = start > 1;
  const canNext = total > 0 && start + 2 <= total;

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <style>{`
        @keyframes cerins-page-next { from { transform: rotateY(0deg) } to { transform: rotateY(-180deg) } }
        @keyframes cerins-page-prev { from { transform: rotateY(-180deg) } to { transform: rotateY(0deg) } }
      `}</style>

      <div
        className="w-full flex items-center justify-between text-white/80 text-sm mb-3"
        style={{ maxWidth: bookWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate">{title}</span>
        <div className="flex items-center gap-4 shrink-0">
          <a href={file} download className="hover:text-white underline underline-offset-4">
            {t.download}
          </a>
          <button type="button" onClick={onClose} aria-label="close" className="hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="relative w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ perspective: 3000, maxWidth: bookWidth }}
      >
        <div className="relative bg-white shadow-2xl" style={{ aspectRatio: aspect * 2 }}>
          {base ? (
            <>
              {/* 쪽을 직접 눌러 넘긴다 — 왼쪽 쪽은 이전, 오른쪽 쪽은 다음 */}
              <div
                role="button"
                tabIndex={-1}
                aria-label="prev"
                onClick={() => void go("prev")}
                className={`absolute left-0 top-0 h-full w-1/2 overflow-hidden bg-white ${
                  canPrev ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {base.left && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={base.left} alt={`page ${start}`} className={pageCls} />
                )}
              </div>
              <div
                role="button"
                tabIndex={-1}
                aria-label="next"
                onClick={() => void go("next")}
                className={`absolute right-0 top-0 h-full w-1/2 overflow-hidden bg-white ${
                  canNext ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {base.right && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={base.right} alt={`page ${start + 1}`} className={pageCls} />
                )}
              </div>
              {/* 책등 그림자 */}
              <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-10 bg-gradient-to-r from-black/0 via-black/20 to-black/0" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">{t.loading}</div>
          )}

          {flip && (
            <div
              className="pointer-events-none absolute right-0 top-0 h-full w-1/2 shadow-2xl"
              style={{
                transformOrigin: "left center",
                transformStyle: "preserve-3d",
                animation: `cerins-page-${flip.dir} ${FLIP_MS}ms ease-in-out forwards`,
              }}
            >
              {flip.front && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={flip.front} alt="" className={pageCls} style={{ backfaceVisibility: "hidden" }} />
              )}
              {flip.back && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={flip.back}
                  alt=""
                  className={pageCls}
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                />
              )}
            </div>
          )}
        </div>

      </div>

      <div className="mt-3 text-white/70 text-sm tabular-nums" onClick={(e) => e.stopPropagation()}>
        {start}–{Math.min(start + 1, total || start + 1)} / {total || "…"}
      </div>
    </div>
  );
}
