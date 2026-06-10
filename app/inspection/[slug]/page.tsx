import { notFound } from "next/navigation";
import Link from "next/link";
import { getPageBySlug } from "@/data/pages";
import PageHero from "@/components/PageHero";

const sideNav = [
  { label: "Pre-Shipment Inspection", slug: "pre-shipment-inspection" },
  { label: "India VOC", slug: "india-voc" },
  { label: "NDT", slug: "ndt" },
  { label: "General Inspection", slug: "general-inspection" },
  { label: "Other Services", slug: "other-services" },
];

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function InspectionPage({ params }: Props) {
  const { slug } = await params;
  const page = getPageBySlug(slug, "inspection");
  if (!page) notFound();

  return (
    <>
      <PageHero title={page.title} subtitle={page.subtitle} breadcrumb="Inspection" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-[#f8f9fc] border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-(--brand)">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Inspection</span>
              </div>
              <nav className="py-2">
                {sideNav.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/inspection/${item.slug}`}
                    className={`block px-4 py-2.5 text-sm transition-colors border-l-2 ${
                      item.slug === slug
                        ? "border-[#c9a84c] text-(--brand) font-semibold bg-white"
                        : "border-transparent text-gray-500 hover:text-(--brand) hover:bg-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Contact card */}
            <div className="mt-4 border border-gray-100 rounded-lg p-4 bg-white">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Enquiries</p>
              <p className="text-sm text-gray-600 mb-3">Have a project in mind? Reach out to our inspection team.</p>
              <Link
                href="/contact"
                className="block text-center text-xs font-semibold text-white bg-(--brand) px-4 py-2 rounded hover:bg-[#0d2a5a] transition"
              >
                Contact Us
              </Link>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="space-y-10">
              {page.content.map((block, i) => (
                <div key={i} className="border-b border-gray-100 pb-8 last:border-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 bg-[#c9a84c] rounded" />
                    <h2 className="text-xl font-bold text-(--brand)">{block.heading}</h2>
                  </div>
                  <p className="text-gray-600 leading-relaxed pl-4">{block.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <Link href="/inspection" className="text-sm text-gray-400 hover:text-(--brand) transition flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Inspection
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
