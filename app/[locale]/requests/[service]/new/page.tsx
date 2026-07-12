import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale, buildLocalizedPath } from "@/src/lib/i18n";
import { getCurrentUser } from "@/src/lib/auth";
import type { LocaleCode } from "@/src/lib/types";
import {
  serviceTypeFromSlug,
  SERVICE_TYPE_LABELS,
  IMPLEMENTED_SERVICE_TYPES,
} from "@/src/lib/serviceRequestTypes";
import RequestForm from "./RequestForm";
import CecRequestForm from "./CecRequestForm";
import ProductInspectionRequestForm from "./ProductInspectionRequestForm";
import ScrapIndiaRequestForm from "./ScrapIndiaRequestForm";

export const metadata: Metadata = {
  title: "의뢰서 작성 - CERINS",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; service: string }>;
}

export default async function NewRequestPage({ params }: Props) {
  const { locale, service } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const serviceType = serviceTypeFromSlug(service);
  if (!serviceType) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(buildLocalizedPath(code, "/login"));

  // 준비 중인 서비스는 선택 화면으로.
  if (!IMPLEMENTED_SERVICE_TYPES.includes(serviceType)) {
    redirect(buildLocalizedPath(code, "/requests"));
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-(--brand) uppercase mb-2">
            {SERVICE_TYPE_LABELS[serviceType]} 의뢰서
          </p>
          <h1 className="text-2xl font-bold text-(--brand)">의뢰서 작성</h1>
          <p className="text-sm text-gray-500 mt-2">
            기본 정보와 의뢰 내용을 입력하고 필수 파일을 첨부하세요.
          </p>
        </header>
        {serviceType === "CEC_INDIA" ? (
          <CecRequestForm
            defaults={{
              company_name: user.company ?? "",
              contact_name: user.login_id,
              contact_email: user.email,
            }}
            detailHrefBase={buildLocalizedPath(code, "/mypage/requests")}
          />
        ) : serviceType === "PRODUCT_INSPECTION" ? (
          <ProductInspectionRequestForm
            defaults={{
              company_name: user.company ?? "",
              contact_name: user.login_id,
              contact_email: user.email,
            }}
            detailHrefBase={buildLocalizedPath(code, "/mypage/requests")}
          />
        ) : serviceType === "SCRAP_INDIA" ? (
          <ScrapIndiaRequestForm
            defaults={{
              company_name: user.company ?? "",
              contact_name: user.login_id,
              contact_email: user.email,
            }}
            detailHrefBase={buildLocalizedPath(code, "/mypage/requests")}
          />
        ) : (
          <RequestForm
            serviceType={serviceType}
            defaults={{
              company_name: user.company ?? "",
              contact_name: user.login_id,
              contact_email: user.email,
            }}
            listHref={buildLocalizedPath(code, "/mypage/requests")}
            detailHrefBase={buildLocalizedPath(code, "/mypage/requests")}
          />
        )}
      </div>
    </div>
  );
}
