import Link from "next/link";
import PageHero from "@/components/PageHero";

const services = [
  {
    slug: "pre-shipment-inspection",
    title: "Pre-Shipment Inspection",
    desc: "Quantity verification, quality check, packaging review, and documentation audit before goods leave the factory.",
    tag: "PSI",
  },
  {
    slug: "india-voc",
    title: "India VOC",
    desc: "Voluntary Overseas Certification for products entering India ??coordinated factory audits and BIS-recognized lab testing.",
    tag: "VOC",
  },
  {
    slug: "ndt",
    title: "NDT",
    desc: "Non-Destructive Testing including UT, RT, MT, PT, VT and ET by certified Level II & III technicians.",
    tag: "NDT",
  },
  {
    slug: "general-inspection",
    title: "General Inspection",
    desc: "DUPRO, Final Random Inspection, Container Loading Supervision, and Factory Audits across major manufacturing hubs.",
    tag: "QC",
  },
  {
    slug: "other-services",
    title: "Other Services",
    desc: "Cargo surveys, production expediting, and trade compliance consulting tailored to your operational needs.",
    tag: "OTHER",
  },
];

export default function InspectionIndexPage() {
  return (
    <>
      <PageHero
        title="Inspection"
        subtitle="Professional inspection and quality assurance services worldwide"
        breadcrumb="Inspection"
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-gray-500 text-sm max-w-2xl mb-10">
          CERINS deploys certified inspectors across Korea, China, Vietnam, India, and Turkey ??ensuring product quality, regulatory conformity, and on-time delivery for every shipment.
        </p>
        <div className="space-y-4">
          {services.map((svc, idx) => (
            <Link
              key={svc.slug}
              href={`/inspection/${svc.slug}`}
              className="group flex items-start gap-5 border border-gray-200 rounded-lg p-6 hover:border-[#0a1f44] hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0 w-14 h-14 bg-[#f0f4fa] rounded-lg flex items-center justify-center group-hover:bg-[#0a1f44] transition-colors">
                <span className="text-xs font-bold text-[#0a1f44] group-hover:text-white transition-colors">
                  {svc.tag}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-[#0a1f44] mb-1 group-hover:text-[#B4123A] transition-colors">
                      {svc.title}
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed">{svc.desc}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5 group-hover:text-[#0a1f44] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

