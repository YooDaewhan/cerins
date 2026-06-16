import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";
import {
  getAlternateUrls,
  getPageWithTranslation,
} from "@/src/lib/mockRepository";
import { isLocale } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = getPageWithTranslation("contact", locale as LocaleCode);
  if (!page) return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        getAlternateUrls("contact").map((a) => [a.locale, a.url]),
      ),
    },
  };
}

const PRIMARY_LABELS = new Set(["Head Office", "Telephone", "Email", "Business Hours"]);

const ICON_BY_HEADING: Record<string, "location" | "phone" | "email" | "clock"> = {
  "Head Office": "location",
  Telephone: "phone",
  Email: "email",
  "Business Hours": "clock",
};

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const page = getPageWithTranslation("contact", code);
  if (!page) notFound();

  const primary = page.translation.content.filter((b) => PRIMARY_LABELS.has(b.heading));
  const regional = page.translation.content.filter((b) => !PRIMARY_LABELS.has(b.heading));

  return (
    <>
      <PageHero
        title={page.translation.title}
        subtitle={page.translation.subtitle}
        breadcrumb="Contact"
        image={page.translation.hero_image}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="bg-white border border-gray-300 shadow-md rounded-xl p-8 space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-0.5 bg-(--brand)" />
                <span className="text-xs font-bold text-(--brand) uppercase tracking-widest">Get In Touch</span>
              </div>
              <h2 className="text-2xl font-bold text-(--brand) mb-3">We&apos;d love to hear from you</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Whether you need a certification quote, have a compliance question, or want to schedule an inspection — our team is ready to assist.
              </p>
            </div>

            <div className="space-y-5">
              {primary.map((block) => (
                <ContactInfoItem
                  key={block.heading}
                  icon={ICON_BY_HEADING[block.heading] ?? "location"}
                  label={block.heading}
                  lines={block.body.split("\n")}
                />
              ))}
            </div>

            {regional.length > 0 && (
              <div className="border-t border-gray-100 pt-6 space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Regional Offices</p>
                {regional.map((block) => (
                  <div key={block.heading}>
                    <p className="text-sm font-semibold text-(--brand)">{block.heading}</p>
                    <p className="text-xs text-gray-500">{block.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-300 shadow-md rounded-xl p-8">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-(--brand)">Send a Message</h3>
              <p className="text-sm text-gray-400 mt-1">We typically respond within 1 business day.</p>
            </div>
            <ContactForm />
          </div>
        </div>
      </div>
    </>
  );
}

function ContactInfoItem({
  icon,
  label,
  lines,
}: {
  icon: "location" | "phone" | "email" | "clock";
  label: string;
  lines: string[];
}) {
  const iconMap: Record<string, React.ReactNode> = {
    location: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    phone: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    email: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    clock: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="flex gap-3">
      <div className="text-(--brand) flex-shrink-0 mt-0.5">{iconMap[icon]}</div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-gray-700">{line}</p>
        ))}
      </div>
    </div>
  );
}
