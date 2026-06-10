import { notFound } from "next/navigation";
import { getPageBySlug } from "@/data/pages";
import PageHero from "@/components/PageHero";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ServicesPage({ params }: Props) {
  const { slug } = await params;
  const page = getPageBySlug(slug, "services");
  if (!page) notFound();

  return (
    <>
      <PageHero title={page.title} subtitle={page.subtitle} breadcrumb="Services" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {page.content.map((block) => (
          <div key={block.heading} className="mb-10">
            <h2 className="text-xl font-bold text-(--brand) mb-3 flex items-center gap-3">
              <span className="w-1 h-5 bg-[#c9a84c] rounded block" />
              {block.heading}
            </h2>
            <p className="text-gray-600 leading-relaxed">{block.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function generateStaticParams() {
  return [
    { slug: "documentation" },
    { slug: "project-management-custom-brokerage" },
  ];
}
