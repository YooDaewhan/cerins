"use client";

import { useState } from "react";
import Link from "next/link";
import { news } from "@/data/news";
import PageHero from "@/components/PageHero";
import Pagination from "@/components/Pagination";

const PER_PAGE = 5;

export default function NewsPage() {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(news.length / PER_PAGE);
  const start = (page - 1) * PER_PAGE;
  const items = news.slice(start, start + PER_PAGE);

  return (
    <>
      <PageHero
        title="News Room"
        subtitle="The latest announcements, insights, and regulatory updates from CERINS."
        breadcrumb="News"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Total count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            Total <span className="font-semibold text-[#0a1f44]">{news.length}</span> articles
          </p>
          <p className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </p>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[60px_1fr_140px_110px] bg-[#0a1f44] text-xs font-semibold text-gray-300 uppercase tracking-wider px-4 py-3">
            <span>No.</span>
            <span>Title</span>
            <span>Author</span>
            <span>Date</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`grid grid-cols-1 sm:grid-cols-[60px_1fr_140px_110px] items-center gap-1 sm:gap-0 px-4 py-4 hover:bg-[#f8f9fc] transition-colors ${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                {/* No */}
                <span className="hidden sm:block text-sm text-gray-400 font-mono">{item.id}</span>

                {/* Title */}
                <div>
                  <Link
                    href={`/news/${item.id}`}
                    className="text-sm font-semibold text-[#0a1f44] hover:text-[#B4123A] transition-colors leading-snug"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.excerpt}</p>
                  {/* Mobile meta */}
                  <p className="sm:hidden text-xs text-gray-400 mt-1">
                    No.{item.id} 쨌 {item.author} 쨌 {item.date}
                  </p>
                </div>

                {/* Author */}
                <span className="hidden sm:block text-sm text-gray-500">{item.author}</span>

                {/* Date */}
                <span className="hidden sm:block text-sm text-gray-400">{item.date}</span>
              </div>
            ))}
          </div>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      </div>
    </>
  );
}

