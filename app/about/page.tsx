import Link from "next/link";
import PageHero from "@/components/PageHero";

const items = [
  {
    slug: "about-cerins",
    title: "About CERINS",
    desc: "Learn who we are ??our history, global reach, and what sets CERINS apart as a trusted certification and inspection partner.",
  },
  {
    slug: "vision",
    title: "Vision",
    desc: "Our mission is to be the most trusted bridge between global markets, enabling seamless international trade compliance.",
  },
  {
    slug: "business-ethics-and-compliance",
    title: "Business Ethics and Compliance",
    desc: "We operate with full transparency, zero-tolerance for corruption, and strict data governance across every jurisdiction we serve.",
  },
  {
    slug: "certification-and-accreditations",
    title: "Certification and Accreditations",
    desc: "Our credentials ??accredited bodies, recognized partnerships, and continuous investment in regulatory alignment.",
  },
  {
    slug: "location",
    title: "Location",
    desc: "Find our head office in Seoul and regional offices in Moscow and Ho Chi Minh City.",
  },
];

export default function AboutIndexPage() {
  return (
    <>
      <PageHero
        title="About CERINS"
        subtitle="Global Certification & Inspection Partner since 2009"
        breadcrumb="About"
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/about/${item.slug}`}
              className="group border border-gray-200 rounded-lg p-6 hover:border-[#0a1f44] hover:shadow-md transition-all"
            >
              <div className="w-8 h-0.5 bg-[#B4123A] mb-4" />
              <h2 className="text-base font-bold text-[#0a1f44] mb-2 group-hover:text-[#B4123A] transition-colors">
                {item.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#0a1f44]">
                Read more
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

