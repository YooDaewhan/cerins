"use client";

import { useState } from "react";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import type { LocaleCode } from "@/src/lib/types";

const DEFAULT_LOCALE: LocaleCode = "ko";
const PER_PAGE = 5;

// 찾는 답이 없을 때 /contact 문의 폼으로. (상단 '문의' 탭은 서비스 의뢰로 감)
const CONTACT_LABEL: Record<LocaleCode, string> = {
  ko: "문의하기",
  en: "Contact us",
  ja: "お問い合わせ",
  zh: "联系我们",
  ru: "Связаться с нами",
  kk: "Бізбен байланысыңыз",
  vi: "Liên hệ với chúng tôi",
};

export interface FaqListRow {
  id: number;
  slug: string;
  title: string;
  summary: string;
  published_at: string;
  author: string;
}

interface FaqListClientProps {
  rows: FaqListRow[];
  locale: LocaleCode;
}

function localized(path: string, locale: LocaleCode): string {
  if (locale === DEFAULT_LOCALE) return path;
  return "/" + locale + path;
}

export default function FaqListClient({ rows, locale }: FaqListClientProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const items = rows.slice(start, start + PER_PAGE);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          Total <span className="font-semibold text-(--brand)">{rows.length}</span> questions
        </p>
        <div className="flex items-center gap-4">
          <Link
            href={localized("/contact", locale)}
            className="text-sm font-semibold text-(--brand) hover:underline"
          >
            {CONTACT_LABEL[locale]} →
          </Link>
          <p className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="hidden sm:grid grid-cols-[60px_1fr_140px_110px] bg-(--brand) text-xs font-semibold text-gray-300 uppercase tracking-wider px-4 py-3">
          <span>No.</span>
          <span>Question</span>
          <span>Author</span>
          <span>Date</span>
        </div>

        <div className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`grid grid-cols-1 sm:grid-cols-[60px_1fr_140px_110px] items-center gap-1 sm:gap-0 px-4 py-4 hover:bg-[#f8f9fc] transition-colors ${
                idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
              }`}
            >
              <span className="hidden sm:block text-sm text-gray-400 font-mono">{item.id}</span>
              <div>
                <Link
                  href={localized(`/faq/${item.slug}`, locale)}
                  className="text-sm font-semibold text-(--brand) hover:text-(--brand) transition-colors leading-snug"
                >
                  {item.title}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.summary}</p>
                <p className="sm:hidden text-xs text-gray-400 mt-1">
                  No.{item.id} · {item.author} · {item.published_at}
                </p>
              </div>
              <span className="hidden sm:block text-sm text-gray-500">{item.author}</span>
              <span className="hidden sm:block text-sm text-gray-400">{item.published_at}</span>
            </div>
          ))}
        </div>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
