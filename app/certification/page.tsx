import Link from "next/link";
import PageHero from "@/components/PageHero";

const countries = [
  { slug: "russia", label: "Russia", desc: "EAC Certificate, GOST-R, Fire Safety & Metrological Approval" },
  { slug: "kazakhstan", label: "Kazakhstan", desc: "EAC Certification, ST KZ, Sanitary & Veterinary Certificates" },
  { slug: "belarus", label: "Belarus", desc: "EAC Conformity, BY National Standards, Hygiene Certificates" },
  { slug: "uzbekistan", label: "Uzbekistan", desc: "O'zstandart Conformity, Hygiene & Metrological Approval" },
  { slug: "ukraine", label: "Ukraine", desc: "UkrSEPRO, Technical Regulations, Sanitary-Hygienic Expertise" },
  { slug: "turkmenistan", label: "Turkmenistan", desc: "Turkmenstandartlary Conformity & Hygiene Certificates" },
  { slug: "azerbaijan", label: "Azerbaijan", desc: "Azstandart Conformity, Sanitary Assessment, Type Approval" },
  { slug: "vietnam", label: "Vietnam", desc: "Conformity Registration (CR), Conformity Announcement (CB)" },
  { slug: "europe", label: "Europe", desc: "CE Marking, EU Directives, REACH & RoHS, UKCA Marking" },
];

export default function CertificationIndexPage() {
  return (
    <>
      <PageHero
        title="Certification"
        subtitle="Market-specific certification services across CIS, Europe, and Asia"
        breadcrumb="Certification"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-gray-500 text-sm max-w-2xl mb-10">
          CERINS facilitates mandatory product certification for exporters entering regulated markets worldwide. Select a country or region below to learn about specific requirements and our service scope.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {countries.map((c) => (
            <Link
              key={c.slug}
              href={`/certification/${c.slug}`}
              className="group flex flex-col border border-gray-200 rounded-lg overflow-hidden hover:border-[var(--brand)] hover:shadow-md transition-all"
            >
              {/* Color band */}
              <div className="h-1.5 bg-[var(--brand)] group-hover:bg-[var(--brand)] transition-colors" />
              <div className="p-5 flex-1">
                <h2 className="text-base font-bold text-[var(--brand)] mb-2 group-hover:text-[var(--brand)] transition-colors">
                  {c.label}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
              </div>
              <div className="px-5 pb-4 flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                View details
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

