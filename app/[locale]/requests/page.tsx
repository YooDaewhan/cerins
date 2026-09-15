import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, buildLocalizedPath, DEFAULT_LOCALE } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";
import {
  CATEGORIES,
  CATEGORY_SERVICES,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_SLUGS,
  IMPLEMENTED_SERVICE_TYPES,
  type Category,
  type ServiceType,
} from "@/src/lib/serviceRequestTypes";

// 페이지 문구만 언어별. TRCU/GOST · CEC India · Scrap India 는 고유명사라 공통.
interface Copy {
  title: string;
  subtitle: string;
  categories: Record<Category, string>;
  productInspection: string;
  comingSoon: string;
  comingSoonTitle: string;
  categoryService: (category: string) => string;
  footnote: string;
}

const COPY: Record<LocaleCode, Copy> = {
  ko: {
    title: "서비스 의뢰",
    subtitle: "원하시는 서비스를 선택해 온라인으로 의뢰서를 작성하세요.",
    categories: { CERTIFICATION: "인증", INSPECTION: "검사", CONSULTING: "컨설팅", LOGISTICS: "물류" },
    productInspection: "제품검사",
    comingSoon: "준비 중",
    comingSoonTitle: "온라인 의뢰 준비 중",
    categoryService: (c) => `${c} 서비스`,
    footnote:
      "현재 인증 · 검사 서비스의 온라인 의뢰가 제공됩니다. 컨설팅 · 물류를 포함한 그 외 서비스는 순차적으로 오픈됩니다.",
  },
  en: {
    title: "Request a Service",
    subtitle: "Choose the service you need and submit your request online.",
    categories: { CERTIFICATION: "Certification", INSPECTION: "Inspection", CONSULTING: "Consulting", LOGISTICS: "Logistics" },
    productInspection: "Product Inspection",
    comingSoon: "Coming soon",
    comingSoonTitle: "Online request coming soon",
    categoryService: (c) => `${c} services`,
    footnote:
      "Online requests are currently available for Certification and Inspection services. Consulting, Logistics and other services will open progressively.",
  },
  ja: {
    title: "サービス依頼",
    subtitle: "ご希望のサービスを選び、オンラインで依頼書を作成してください。",
    categories: { CERTIFICATION: "認証", INSPECTION: "検査", CONSULTING: "コンサルティング", LOGISTICS: "物流" },
    productInspection: "製品検査",
    comingSoon: "準備中",
    comingSoonTitle: "オンライン依頼は準備中",
    categoryService: (c) => `${c}サービス`,
    footnote:
      "現在は認証・検査サービスのオンライン依頼をご利用いただけます。コンサルティング・物流を含むその他のサービスは順次公開予定です。",
  },
  zh: {
    title: "服务委托",
    subtitle: "选择所需服务，在线填写委托申请。",
    categories: { CERTIFICATION: "认证", INSPECTION: "检验", CONSULTING: "咨询", LOGISTICS: "物流" },
    productInspection: "产品检验",
    comingSoon: "即将开放",
    comingSoonTitle: "在线委托即将开放",
    categoryService: (c) => `${c}服务`,
    footnote: "目前提供认证 · 检验服务的在线委托。包括咨询 · 物流在内的其他服务将陆续开放。",
  },
  ru: {
    title: "Заявка на услугу",
    subtitle: "Выберите нужную услугу и оформите заявку онлайн.",
    categories: { CERTIFICATION: "Сертификация", INSPECTION: "Инспекция", CONSULTING: "Консалтинг", LOGISTICS: "Логистика" },
    productInspection: "Инспекция продукции",
    comingSoon: "Скоро",
    comingSoonTitle: "Онлайн-заявка скоро будет доступна",
    categoryService: (c) => `Услуги: ${c}`,
    footnote:
      "Сейчас онлайн-заявки доступны для услуг сертификации и инспекции. Остальные услуги, включая консалтинг и логистику, будут открываться постепенно.",
  },
  kk: {
    title: "Қызметке өтінім",
    subtitle: "Қажетті қызметті таңдап, өтінімді онлайн толтырыңыз.",
    categories: { CERTIFICATION: "Сертификаттау", INSPECTION: "Инспекция", CONSULTING: "Консалтинг", LOGISTICS: "Логистика" },
    productInspection: "Өнім инспекциясы",
    comingSoon: "Жақында",
    comingSoonTitle: "Онлайн өтінім жақында қолжетімді",
    categoryService: (c) => `${c} қызметтері`,
    footnote:
      "Қазіргі уақытта сертификаттау · инспекция қызметтеріне онлайн өтінім беруге болады. Консалтинг · логистиканы қоса алғанда, басқа қызметтер кезең-кезеңімен ашылады.",
  },
  vi: {
    title: "Yêu cầu dịch vụ",
    subtitle: "Chọn dịch vụ bạn cần và gửi yêu cầu trực tuyến.",
    categories: { CERTIFICATION: "Chứng nhận", INSPECTION: "Giám định", CONSULTING: "Tư vấn", LOGISTICS: "Logistics" },
    productInspection: "Giám định sản phẩm",
    comingSoon: "Sắp ra mắt",
    comingSoonTitle: "Yêu cầu trực tuyến sắp ra mắt",
    categoryService: (c) => `Dịch vụ ${c}`,
    footnote:
      "Hiện tại có thể gửi yêu cầu trực tuyến cho dịch vụ Chứng nhận · Giám định. Các dịch vụ khác bao gồm Tư vấn · Logistics sẽ mở dần.",
  },
};

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = COPY[isLocale(locale) ? (locale as LocaleCode) : DEFAULT_LOCALE];
  return { title: `${t.title} - CERINS`, description: t.subtitle };
}

export default async function RequestsIndexPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;
  const t = COPY[code];
  const serviceLabel = (svc: ServiceType) =>
    svc === "PRODUCT_INSPECTION" ? t.productInspection : SERVICE_TYPE_LABELS[svc];

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-(--brand) uppercase mb-2">
            Service Request
          </p>
          <h1 className="text-2xl font-bold text-(--brand)">{t.title}</h1>
          <p className="text-sm text-gray-500 mt-2">{t.subtitle}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {(CATEGORIES as readonly Category[]).map((cat) => (
            <section key={cat} className="bg-white border border-gray-200 rounded-xl p-6 aspect-square flex flex-col">
              <h2 className="text-lg font-bold text-(--brand) mb-4">{t.categories[cat]}</h2>
              <div className="grid grid-cols-1 gap-3 flex-1 content-center">
                {CATEGORY_SERVICES[cat].length === 0 && (
                  <div
                    className="flex items-center justify-between rounded-lg border border-dashed border-gray-200 bg-gray-50 px-5 py-4 cursor-not-allowed"
                    title={t.comingSoonTitle}
                  >
                    <span className="text-base font-semibold text-gray-400">
                      {t.categoryService(t.categories[cat])}
                    </span>
                    <span className="text-xs font-semibold text-gray-400">{t.comingSoon}</span>
                  </div>
                )}
                {CATEGORY_SERVICES[cat].map((svc) => {
                  const implemented = IMPLEMENTED_SERVICE_TYPES.includes(svc);
                  const href = buildLocalizedPath(code, `/requests/${SERVICE_TYPE_SLUGS[svc]}/new`);
                  return implemented ? (
                    <Link
                      key={svc}
                      href={href}
                      className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-(--brand) hover:shadow-md transition-all"
                    >
                      <span className="text-base font-bold text-(--brand)">{serviceLabel(svc)}</span>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-(--brand)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : (
                    <div
                      key={svc}
                      className="flex items-center justify-between rounded-lg border border-dashed border-gray-200 bg-gray-50 px-5 py-4 cursor-not-allowed"
                      title={t.comingSoonTitle}
                    >
                      <span className="text-base font-semibold text-gray-400">{serviceLabel(svc)}</span>
                      <span className="text-xs font-semibold text-gray-400">{t.comingSoon}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-6">{t.footnote}</p>
      </div>
    </div>
  );
}
