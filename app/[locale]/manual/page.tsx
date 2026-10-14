import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import { buildLocalizedPath, isLocale } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";

// ponytail: 매뉴얼은 한국어 한 벌. 다른 언어 URL(/en/manual 등)도 같은 내용을 보여준다.
export const metadata: Metadata = {
  title: "이용 매뉴얼 - CERINS",
  description: "CERINS 사이트의 회원가입, 서비스 의뢰, 직원·관리자 업무 처리 방법 안내",
  // 직원·관리자 업무 안내가 섞여 있어 검색 노출은 하지 않는다.
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ locale: string }>;
}

type Row = [step: string, status: string, action: string, who: string];

interface Flow {
  id: string;
  title: string;
  path: string;
  stages: string[];
  rows: Row[];
  notes?: string[];
}

const ROLES: [string, string, string][] = [
  ["일반 회원 (1)", "회원가입 시 ‘개인’ 선택", "서비스 의뢰 등록, 마이페이지, 내 의뢰 조회"],
  ["기업 회원 (3)", "회원가입 시 ‘기업’ 선택", "일반 회원과 동일"],
  ["직원 (7)", "관리자가 회원 관리에서 승격", "배정된 의뢰 처리(담당 의뢰), 직원 평가 작성"],
  ["관리자 (9)", "관리자가 회원 관리에서 승격", "관리자 페이지 전체, 모든 의뢰의 담당자 지정·처리, 사진보고서 보관함"],
];

const FLOWS: Flow[] = [
  {
    id: "flow-trcu",
    title: "TRCU / GOST 인증",
    path: "/requests/trcu-gost/new",
    stages: ["접수/검토", "견적/선금", "인증 진행", "잔금", "최종 발행"],
    rows: [
      ["0", "의뢰 접수", "담당자 지정 (접수번호 발급)", "관리자"],
      ["1", "담당자 검토 중", "[접수] → 3 · [반려] → 2", "담당자"],
      ["2", "서류 보완 요청", "[보완 후 재제출] → 1", "고객"],
      ["3", "견적 준비 중", "[견적 작성] 항목·수량·단가 입력, 선금 50% 자동 계산 → 4", "담당자"],
      ["4", "선금 입금 요청", "[선금 입금] 입금자명·계좌·입금일자 입력 → 5", "고객"],
      ["5", "선금 확인 중", "[입금확인] → 7 · [확인불가] → 6", "담당자"],
      ["6", "선금 확인 불가", "[선금 정보 재제출] → 5", "고객"],
      ["7", "인증 진행 중", "[인증완료] → 9 · [인증불가/보완] → 8", "담당자"],
      ["8", "인증 보완 필요", "고객 [보완 자료 업로드] / 담당자 [인증 재개] → 7", "고객·담당자"],
      ["9", "잔금 대기", "[초안 확인 후 잔금 입금] → 10", "고객"],
      ["10", "잔금 확인 중", "[잔금확인] → 11", "담당자"],
      ["11", "최종 인증서 등록", "[최종 인증서 등록/완료] (PDF) → 완료", "담당자"],
    ],
  },
  {
    id: "flow-cec",
    title: "CEC India 인증",
    path: "/requests/cec-india/new",
    stages: ["접수/검토", "선금/검사", "가격평가", "인증서 초안", "최종 초안/잔금", "발급 완료"],
    rows: [
      ["0", "의뢰 접수", "담당자 지정", "관리자"],
      ["1", "서류 검토", "[접수 (검사일정 입력)] → 선금 900 USD 안내 · [서류 반려] → 2", "담당자"],
      ["2", "서류 보완 요청", "[보완 후 재제출] → 1", "고객"],
      ["3", "선금 입금 대기", "[선금 입금]", "고객"],
      ["3", "선금 확인 중", "[선금 입금확인] / [선금 확인불가]", "담당자"],
      ["3", "검사 예정·진행", "[검사 예정으로 변경] → [검사 시작] → [검사 결과/가격평가 입력] → 5", "담당자"],
      ["4", "검사 진행 불가", "[검사 재개]", "담당자"],
      ["5", "가격평가 확인 대기", "[가격평가 확인] → 7 · [가격평가 거절] → 6", "고객"],
      ["6", "가격평가 거절", "[평가 수정 재제출] → 5", "담당자"],
      ["7", "인증서 초안", "담당자 [인증서 초안 업로드] → 고객 [초안 승인 + 선적서류 제출] → 9 또는 [초안 거절] → 8", "담당자·고객"],
      ["8", "보완 필요", "[보완 완료 (복귀)]", "담당자"],
      ["9", "최종 초안 작성", "[최종 초안 준비 완료] (워터마크 초안 + 세금계산서) → 11", "담당자"],
      ["11", "잔금 대기", "[초안 확인 후 잔금 입금] · [최종 초안 거절] → 10", "고객"],
      ["11", "잔금 확인", "[잔금 입금확인] → [최종 인증서 등록/완료] → 13", "담당자"],
    ],
    notes: [
      "선금은 900 USD 고정입니다.",
      "최종 총액 = 기본 인증비 + 실제 검사일수 × 1일 검사비 + 물건가액 × 0.5%(추가 수수료 적용 시). 잔금 = 총액 − 선금.",
      "최종 인증서 초안은 고객에게 미리보기만 제공되며, 완료 후 다운로드할 수 있습니다.",
    ],
  },
  {
    id: "flow-product",
    title: "제품검사",
    path: "/requests/product-inspection/new",
    stages: ["접수/검토", "검사 일정/진행", "검사 완료/리포트", "외부기관 제출", "완료"],
    rows: [
      ["0", "제품검사 의뢰", "담당자 지정", "관리자"],
      ["1", "담당자 검토", "[검사 일정 확정] → 3 · [보완 요청] → 2", "담당자"],
      ["2", "고객 보완 요청", "[보완 후 재제출] → 1", "고객"],
      ["3", "검사 일정 확정", "[일정 변경] · [검사 시작] · [검사 완료] → 5", "담당자"],
      ["4", "검사 진행 보류", "[검사 재개]", "담당자"],
      ["5", "리포트 작성 중", "[리포트 제출 완료] 인증기관명·제출일 입력 → 7", "담당자"],
      ["7", "외부기관 제출 완료", "[외부기관 입금 입력] (내부용) · [최종 완료] → 9", "담당자"],
      ["9", "최종 완료", "—", "—"],
    ],
    notes: ["고객 결제 단계가 없습니다. 외부 인증기관 정산은 내부 기록용입니다.", "제품사진은 최소 1장 이상 필수입니다."],
  },
  {
    id: "flow-scrap",
    title: "Scrap India 검사",
    path: "/requests/scrap-india/new",
    stages: ["접수/일정", "현장검사", "고객 서류", "리포트/청구", "입금", "DGFT 등록", "완료"],
    rows: [
      ["0", "스크랩 검사 의뢰", "담당자 지정", "관리자"],
      ["1", "일정 검토", "[검사일정 확인] → 3 · [일정 조정 요청] → 2", "담당자"],
      ["2", "일정 조정 요청", "[일정 수정 후 재제출] → 1", "고객"],
      ["3", "현장검사", "[검사 시작] → [검사 완료] → 5 · [검사 진행 문제] → 4", "담당자"],
      ["5", "고객 서류 대기", "[서류 제출] (필수* 항목 모두)", "고객"],
      ["5", "서류 검토 중", "[서류 확인 완료] → 7 · [서류 보완 요청] → 6", "담당자"],
      ["6", "서류 보완 요청", "[서류 재제출] → 5", "고객"],
      ["7", "리포트 작성", "[내부 리포트 완료] → [청구하기] 청구서 업로드 → 9", "담당자"],
      ["9", "입금 대기", "[입금 완료] 입금자명·입금일자·증빙 → 입금 확인 중", "고객"],
      ["9", "입금 확인 중", "[입금 확인] → 11 · [확인 불가] → 10", "담당자"],
      ["11", "DGFT 등록", "[DGFT 문서 작성 시작] → [DGFT 등록 시작] → [등록확인 (최종 완료)] → 13", "담당자"],
    ],
    notes: ["고객 제출 서류 항목은 관리자 ‘제출서류 항목 관리’에서 정합니다."],
  },
];

const ADMIN_TABS: [string, string, string][] = [
  ["메뉴", "/admin/menus", "헤더 메뉴 구조·순서·링크·노출 여부. 하위 메뉴가 있으면 메가패널로 표시됩니다."],
  ["페이지", "/admin/pages", "페이지 생성·편집. ‘독립’ 템플릿은 /{slug} 주소로 바로 노출됩니다."],
  ["뉴스", "/admin/posts", "뉴스 작성(본문 에디터, 썸네일, 발행일). 팝업 공개와 노출기간을 설정하면 사이트에 팝업으로 뜹니다."],
  ["FAQ", "/admin/faqs", "자주 묻는 질문 작성. 뉴스와 같은 편집기를 사용합니다."],
  ["히어로 슬라이드", "/admin/hero-slides", "홈 상단 슬라이드의 문구, 배경 이미지·영상, 순서, 노출 여부."],
  ["파트너", "/admin/partners", "파트너 로고·링크·순서 (한국어 관리자 전용)."],
  ["의뢰 관리", "/admin/requests", "전체 의뢰 목록과 필터(서비스·상태·완료여부·회사명·접수번호·기간). 상세에서 담당자 지정."],
  ["의뢰 현황 대시보드", "/admin/requests/dashboard", "기간·담당자별 접수/진행/완료 건수, 견적 총액, 추이 차트, 담당자별 실적."],
  ["제출서류 항목 관리", "/admin/requests/documents", "Scrap India 고객 제출 서류 항목(필수 여부, 복수 파일 허용)."],
  ["회원", "/admin", "회원 검색·필터, 회원 추가, 레벨 변경(직원·관리자 승격), 비밀번호 재설정, 삭제, 메일 작성창 열기."],
  ["메일 발송", "/admin/email", "수신 동의 회원에게 메일 발송, 양식 저장·불러오기, 발송 로그."],
  ["문의 / 고객만족도 / 직원평가", "/admin/inquiries", "사이트에서 접수된 문의와 평가 내역 조회."],
  ["언어 관리", "/admin/locales", "편집 언어 전환기의 ‘언어 추가’ 링크로 진입. 언어 추가·활성화."],
];

const TOC: [string, string][] = [
  ["start", "시작하기"],
  ["account", "회원가입 · 로그인"],
  ["request", "서비스 의뢰하기"],
  ["flows", "서비스별 진행 단계"],
  ["staff", "직원 업무"],
  ["admin", "관리자 페이지"],
  ["photo-report", "검사 보고서 생성"],
  ["etc", "기타 기능"],
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-gray-200 pt-10">
      <h2 className="text-xl sm:text-2xl font-bold text-(--brand) mb-5">{title}</h2>
      <div className="space-y-4 text-sm sm:text-[15px] text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-(--brand) text-white text-xs font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-(--surface-2) border-l-4 border-(--gold) px-4 py-3 text-gray-700">{children}</p>
  );
}

function Path({ children }: { children: string }) {
  return <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.9em] text-(--brand)">{children}</code>;
}

export default async function ManualPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const href = (p: string) => buildLocalizedPath(locale as LocaleCode, p);

  return (
    <>
      <PageHero title="이용 매뉴얼" subtitle="CERINS 사이트 이용 방법을 역할별로 안내합니다." breadcrumb="Manual" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
        <nav aria-label="목차" className="mb-10 lg:mb-0">
          <div className="lg:sticky lg:top-[calc(var(--header-h,5rem)+1.5rem)]">
            <p className="text-xs font-bold text-(--brand) uppercase tracking-widest mb-3">목차</p>
            <ul className="flex flex-wrap gap-2 lg:block lg:space-y-1">
              {TOC.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block rounded-md px-3 py-1.5 text-sm text-gray-600 border border-gray-200 lg:border-transparent hover:text-(--brand) hover:bg-(--brand)/5 transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="space-y-12 min-w-0">
          <Section id="start" title="시작하기">
            <p>CERINS 사이트는 회원 등급에 따라 사용할 수 있는 기능이 다릅니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-(--surface-2) text-gray-800">
                  <tr>
                    <th className="px-3 py-2 font-semibold">등급</th>
                    <th className="px-3 py-2 font-semibold">부여 방법</th>
                    <th className="px-3 py-2 font-semibold">할 수 있는 일</th>
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map(([r, how, can]) => (
                    <tr key={r} className="border-t border-gray-200">
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">{r}</td>
                      <td className="px-3 py-2">{how}</td>
                      <td className="px-3 py-2">{can}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Note>
              언어는 헤더의 언어 버튼에서 바꿀 수 있으며, 보던 페이지가 그대로 유지됩니다. 한국어는 주소에 언어 코드가
              붙지 않고, 다른 언어는 <Path>/en/…</Path> 처럼 붙습니다.
            </Note>
          </Section>

          <Section id="account" title="회원가입 · 로그인">
            <h3 className="font-bold text-gray-900">회원가입 (<a className="text-(--brand) underline" href={href("/signup")}>/signup</a>)</h3>
            <Steps
              items={[
                "회원 구분(개인/기업)과 국가를 선택합니다.",
                "아이디(영문·숫자·_ 4~32자), 비밀번호(8자 이상), 이메일을 입력합니다.",
                <>[인증번호 발송]을 누르고, 메일로 받은 6자리 번호를 <b>5분 이내</b>에 입력한 뒤 [확인]을 누릅니다.</>,
                "회사명, 회사 전화번호, 회사 주소, 직위를 입력하고 [회원가입]을 누릅니다.",
              ]}
            />
            <h3 className="font-bold text-gray-900 pt-2">로그인 · 마이페이지</h3>
            <p>
              <a className="text-(--brand) underline" href={href("/login")}>/login</a>에서 아이디와 비밀번호로 로그인합니다
              (로그인 유지 7일). 헤더의 사용자 메뉴에서 <b>마이페이지</b>로 이동해 회원 정보를 확인하고, [내 의뢰]에서
              진행 중인 의뢰를 볼 수 있습니다.
            </p>
          </Section>

          <Section id="request" title="서비스 의뢰하기">
            <Steps
              items={[
                <>
                  <a className="text-(--brand) underline" href={href("/requests")}>서비스 의뢰</a> 페이지에서 원하는
                  서비스(TRCU/GOST, CEC India, 제품검사, Scrap India)를 선택합니다. 로그인이 필요합니다.
                </>,
                "기본 정보(회사명·담당자·연락처·이메일)는 회원 정보로 미리 채워집니다.",
                "서비스별 항목(제품 정보, 검사 희망 일정, 현장 담당자 등)을 입력하고 서류를 첨부합니다.",
                "[의뢰 제출]을 누르면 의뢰 상세 화면으로 이동합니다.",
                "관리자가 담당자를 지정하면 접수번호가 발급되고, 단계가 바뀔 때마다 메일로 안내됩니다.",
              ]}
            />
            <Note>
              첨부 파일은 최대 50MB까지, PDF·이미지·Office 문서·ZIP·DWG·STEP 형식을 올릴 수 있습니다. 최종 인증서는 PDF만
              등록됩니다.
            </Note>
            <p>
              진행 상황은 <b>마이페이지 → 내 의뢰</b>에서 확인합니다. 상세 화면 아래 ‘처리’ 영역에 지금 고객이 눌러야 할
              버튼(재제출, 입금, 승인 등)이 표시됩니다. 최종 인증서가 발급되면 목록에서 바로 다운로드할 수 있습니다.
            </p>
          </Section>

          <Section id="flows" title="서비스별 진행 단계">
            <p>
              표의 ‘담당자’는 배정된 직원을 뜻하며, 관리자는 담당자가 할 수 있는 모든 처리를 할 수 있습니다. 화살표 뒤
              숫자는 이동하는 단계(step)입니다.
            </p>
            {FLOWS.map((f) => (
              <details key={f.id} id={f.id} className="group rounded-xl border border-gray-200 bg-white open:shadow-sm">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-4">
                  <span className="font-bold text-gray-900">{f.title}</span>
                  <span className="text-(--brand) text-lg transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-5 pb-5 space-y-4">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {f.stages.map((s, i) => (
                      <span key={s} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-gray-300">›</span>}
                        <span className="rounded-full bg-(--brand)/10 text-(--brand) font-semibold px-2.5 py-0.5">{s}</span>
                      </span>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-gray-500 text-xs">
                        <tr>
                          <th className="py-2 pr-3 font-semibold">step</th>
                          <th className="py-2 pr-3 font-semibold">상태</th>
                          <th className="py-2 pr-3 font-semibold">처리</th>
                          <th className="py-2 font-semibold">주체</th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.rows.map(([step, status, action, who], i) => (
                          <tr key={i} className="border-t border-gray-100 align-top">
                            <td className="py-2 pr-3 font-mono text-gray-400">{step}</td>
                            <td className="py-2 pr-3 font-medium whitespace-nowrap">{status}</td>
                            <td className="py-2 pr-3">{action}</td>
                            <td className="py-2 whitespace-nowrap text-gray-500">{who}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {f.notes && (
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      {f.notes.map((n) => <li key={n}>{n}</li>)}
                    </ul>
                  )}
                  <p className="text-xs text-gray-500">
                    의뢰서 주소: <Path>{f.path}</Path>
                  </p>
                </div>
              </details>
            ))}
          </Section>

          <Section id="staff" title="직원 업무">
            <Steps
              items={[
                <>
                  마이페이지의 [담당 의뢰] 또는 <a className="text-(--brand) underline" href={href("/staff/requests")}>/staff/requests</a>
                  에서 나에게 배정된 의뢰만 확인합니다.
                </>,
                "의뢰를 열면 현재 단계에서 처리할 수 있는 버튼이 표시됩니다. 입력 창을 채우고 확정하면 다음 단계로 넘어가고 고객에게 메일이 발송됩니다.",
                "내부 메모와 내부 파일은 고객에게 보이지 않습니다.",
              ]}
            />
            <Note>홈 화면과 푸터의 ‘Staff Evaluation’ 버튼으로 직원 평가를 제출할 수 있습니다.</Note>
          </Section>

          <Section id="admin" title="관리자 페이지">
            <p>
              관리자(레벨 9)는 헤더 사용자 메뉴의 <b>관리자 페이지</b>로 들어갑니다. 상단 언어 전환기로 편집 언어를 바꾸며,
              한국어 외 언어에서는 콘텐츠 번역만 편집할 수 있습니다.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {ADMIN_TABS.map(([name, path, desc]) => (
                <div key={name} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-(--brand)/40 transition-colors">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-bold text-gray-900">{name}</span>
                    <Path>{path}</Path>
                  </div>
                  <p className="text-gray-600 text-sm">{desc}</p>
                </div>
              ))}
            </div>
            <h3 className="font-bold text-gray-900 pt-2">담당자 지정 방법</h3>
            <Steps
              items={[
                "의뢰 관리에서 의뢰를 엽니다.",
                "[담당자 지정] → 담당 직원을 선택 → [지정 (접수번호 발급)]을 누릅니다.",
                "이후 [담당자 변경]으로 바꿀 수 있으며, 변경해도 진행 단계는 그대로입니다.",
              ]}
            />
          </Section>

          <Section id="photo-report" title="검사 보고서 생성">
            <p>
              <a className="text-(--brand) underline" href="/photo-report">/photo-report</a> 에서 검사 보고서(Word)를 작성합니다.
              로그인 없이 사용할 수 있습니다.
            </p>
            <Steps
              items={[
                "상단 탭에서 보고서 종류(CEC / SCRAP / PSIC / 직접 업로드)를 고릅니다. 화면 언어는 한·EN·中·VI 중 선택할 수 있습니다.",
                "작성자 이름과 각 항목을 입력합니다. CEC는 [이전]/[다음]으로 단계를 이동하며, ‘+ 물품 추가’로 물품을 늘릴 수 있습니다.",
                "사진(jpg·png·webp)을 올리고 필요하면 캡션을 수정합니다.",
                "서명 칸의 [눌러서 서명하기]로 서명 창을 열어 서명한 뒤 [이 서명 사용]을 누릅니다.",
                "[완료 – Word 파일 다운로드]를 누르면 보고서가 생성·다운로드됩니다.",
              ]}
            />
            <Note>
              입력값은 이 기기에 자동 저장되지만 사진은 저장되지 않습니다. 생성된 보고서는 서버에 보관되며 관리자는
              <a className="text-(--brand) underline mx-1" href="/photo-report/admin">사진보고서 보관함</a>에서 다시 내려받을 수 있습니다.
            </Note>
          </Section>

          <Section id="etc" title="기타 기능">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <b>검색</b> — 헤더 검색창에 인증·국가명을 입력합니다. 옆의 상세검색 버튼으로 그리고/또는/제외 조건을
                조합할 수 있습니다.
              </li>
              <li>
                <b>문의</b> — <a className="text-(--brand) underline" href={href("/contact")}>문의하기</a> 폼으로 메시지를
                보내면 관리자 ‘문의’ 탭에 접수됩니다. 보통 1 영업일 이내에 답변드립니다.
              </li>
              <li>
                <b>뉴스 · FAQ</b> — <a className="text-(--brand) underline" href={href("/news")}>뉴스</a>,{" "}
                <a className="text-(--brand) underline" href={href("/faq")}>FAQ</a> 에서 공지와 자주 묻는 질문을 확인합니다.
              </li>
              <li>
                <b>업무 프로세스</b> — <a className="text-(--brand) underline" href="/process">/process</a> 에서 인증·검사
                업무 구분을 한눈에 볼 수 있습니다.
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
