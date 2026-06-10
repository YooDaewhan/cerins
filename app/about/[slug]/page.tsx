import { notFound } from "next/navigation";
import Link from "next/link";
import { getPageBySlug } from "@/data/pages";
import PageHero from "@/components/PageHero";

const sideNav = [
  { label: "About CERINS", slug: "about-cerins" },
  { label: "Vision", slug: "vision" },
  { label: "Business Ethics and Compliance", slug: "business-ethics-and-compliance" },
  { label: "Certification and Accreditations", slug: "certification-and-accreditations" },
  { label: "Location", slug: "location" },
];

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AboutPage({ params }: Props) {
  const { slug } = await params;
  const page = getPageBySlug(slug, "about");
  if (!page) notFound();

  return (
    <>
      <PageHero title={page.title} subtitle={page.subtitle} breadcrumb="About" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-[#f8f9fc] border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-[#0a1f44]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">About</span>
              </div>
              <nav className="py-2">
                {sideNav.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/about/${item.slug}`}
                    className={`block px-4 py-2.5 text-sm transition-colors border-l-2 ${
                      item.slug === slug
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
            <div className="space-y-10">
              {page.content.map((block, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 bg-[#c9a84c] rounded" />
                    <h2 className="text-xl font-bold text-[#0a1f44]">{block.heading}</h2>
                  </div>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line pl-4">{block.body}</p>
                </div>
              ))}
            </div>

            {/* Bottom nav */}
            <div className="mt-14 pt-6 border-t border-gray-100 flex items-center justify-between">
              <Link href="/about" className="text-sm text-gray-400 hover:text-[#0a1f44] transition flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to About
              </Link>
              <Link href="/contact" className="text-sm font-semibold text-white bg-[#0a1f44] px-5 py-2 rounded hover:bg-[#0d2a5a] transition">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function generateStaticParams() {
  return sideNav.map((item) => ({ slug: item.slug }));
}
