import { notFound } from "next/navigation";
import Link from "next/link";
import { getPageBySlug } from "@/data/pages";
import PageHero from "@/components/PageHero";

const sideNav = [
  { label: "Russia", slug: "russia" },
  { label: "Kazakhstan", slug: "kazakhstan" },
  { label: "Belarus", slug: "belarus" },
  { label: "Uzbekistan", slug: "uzbekistan" },
  { label: "Ukraine", slug: "ukraine" },
  { label: "Turkmenistan", slug: "turkmenistan" },
  { label: "Azerbaijan", slug: "azerbaijan" },
  { label: "Vietnam", slug: "vietnam" },
  { label: "Europe", slug: "europe" },
];

interface Props {
  params: Promise<{ country: string }>;
}

export default async function CertificationPage({ params }: Props) {
  const { country } = await params;
  const page = getPageBySlug(country, "certification");
  if (!page) notFound();

  return (
    <>
      <PageHero title={page.title} subtitle={page.subtitle} breadcrumb="Certification" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-[#f8f9fc] border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-[#0a1f44]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Certification</span>
              </div>
              <nav className="py-2">
                {sideNav.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/certification/${item.slug}`}
                    className={`block px-4 py-2.5 text-sm transition-colors border-l-2 ${
                      item.slug === country
                        ? "border-[#c9a84c] text-[#0a1f44] font-semibold bg-white"
                        : "border-transparent text-gray-500 hover:text-[#0a1f44] hover:bg-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Highlight box */}
            <div className="bg-[#f0f4fa] border-l-4 border-[#c9a84c] rounded-r-lg px-5 py-4 mb-8">
              <p className="text-sm text-[#0a1f44] font-medium">
                CERINS provides end-to-end certification support for the <strong>{page.title}</strong> — from documentation preparation to certificate issuance.
              </p>
            </div>

            <div className="space-y-10">
              {page.content.map((block, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 bg-[#c9a84c] rounded" />
                    <h2 className="text-xl font-bold text-[#0a1f44]">{block.heading}</h2>
                  </div>
                  <p className="text-gray-600 leading-relaxed pl-4">{block.body}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12 bg-[#0a1f44] rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold text-base mb-1">Need a certification quote?</p>
                <p className="text-gray-400 text-sm">Our experts will review your product and provide a detailed proposal.</p>
              </div>
              <Link
                href="/contact"
                className="flex-shrink-0 px-6 py-2.5 bg-[#c9a84c] text-[#0a1f44] font-semibold text-sm rounded hover:bg-[#b8973b] transition"
              >
                Request a Quote
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <Link href="/certification" className="text-sm text-gray-400 hover:text-[#0a1f44] transition flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Certification
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function generateStaticParams() {
  return sideNav.map((item) => ({ country: item.slug }));
}
