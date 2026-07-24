import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";
import {
  getAlternateUrls,
  getPageWithTranslation,
} from "@/src/lib/mockRepository";
import { getCurrentUser } from "@/src/lib/auth";
import { isLocale } from "@/src/lib/i18n";
import type { LocaleCode } from "@/src/lib/types";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = await getPageWithTranslation("contact", locale as LocaleCode);
  if (!page) return {};
  return {
    title: page.translation.meta_title,
    description: page.translation.meta_description,
    alternates: {
      languages: Object.fromEntries(
        (await getAlternateUrls("contact")).map((a) => [a.locale, a.url]),
      ),
    },
  };
}

// 이메일/전화는 언어 공통, 라벨(사무소명)만 언어별. offices 배열 순서와 아래 T.offices 순서 일치.
const CONTACT_DIRECTORY = [
  { email: "korcerins@cerins.net", tel: "+82 2 337 4611" },
  { email: "ruscerins@cerins.net", tel: "+7 499 957 84 05" },
  { email: "kazcerins@cerins.net", tel: "+7 727 220 68 25" },
  { email: null, tel: "+91 9033 790 007" },
  { email: "vncerins@cerins.net", tel: "+84 283 6202526" },
  { email: "chncerins@cerins.net", tel: "+86 021 5039 0399" },
  { email: "uzbcerins@cerins.net", tel: "+998 95 194 3747" },
];

// 이 페이지 전용 UI 문구 (제목/부제는 이미 번역 DB에서 옴).
const T: Record<
  LocaleCode,
  {
    breadcrumb: string;
    getInTouch: string;
    heading: string;
    intro: string;
    regionalOffices: string;
    sendMessage: string;
    responseNote: string;
    tbd: string;
    offices: string[];
  }
> = {
  ko: {
    breadcrumb: "문의",
    getInTouch: "문의하기",
    heading: "언제든지 연락 주세요",
    intro: "인증 견적, 규제 관련 문의, 검사 일정 예약 등 무엇이든 저희 팀이 도와드리겠습니다.",
    regionalOffices: "지역 사무소",
    sendMessage: "메시지 보내기",
    responseNote: "보통 1 영업일 이내에 답변드립니다.",
    tbd: "(추가예정)",
    offices: ["본사", "러시아 세린스", "카자흐스탄 세린스", "인도 세린스", "베트남 세린스", "중국 세린스", "우즈베키스탄 세린스"],
  },
  en: {
    breadcrumb: "Contact",
    getInTouch: "Get In Touch",
    heading: "We'd love to hear from you",
    intro: "Whether you need a certification quote, have a compliance question, or want to schedule an inspection — our team is ready to assist.",
    regionalOffices: "Regional Offices",
    sendMessage: "Send a Message",
    responseNote: "We typically respond within 1 business day.",
    tbd: "(coming soon)",
    offices: ["Head Office", "CERINS Russia", "CERINS Kazakhstan", "CERINS India", "CERINS Vietnam", "CERINS China", "CERINS Uzbekistan"],
  },
  ja: {
    breadcrumb: "お問い合わせ",
    getInTouch: "お問い合わせ",
    heading: "お気軽にご連絡ください",
    intro: "認証のお見積もり、コンプライアンスに関するご質問、検査のご予約など、当社チームがお手伝いいたします。",
    regionalOffices: "地域事務所",
    sendMessage: "メッセージを送る",
    responseNote: "通常、1営業日以内に返信いたします。",
    tbd: "(準備中)",
    offices: ["本社", "セリンス ロシア", "セリンス カザフスタン", "セリンス インド", "セリンス ベトナム", "セリンス 中国", "セリンス ウズベキスタン"],
  },
  zh: {
    breadcrumb: "联系",
    getInTouch: "联系我们",
    heading: "期待您的来信",
    intro: "无论您需要认证报价、有合规问题，还是想安排检验，我们的团队随时为您提供帮助。",
    regionalOffices: "地区办事处",
    sendMessage: "发送消息",
    responseNote: "我们通常在1个工作日内回复。",
    tbd: "(即将推出)",
    offices: ["总部", "俄罗斯 CERINS", "哈萨克斯坦 CERINS", "印度 CERINS", "越南 CERINS", "中国 CERINS", "乌兹别克斯坦 CERINS"],
  },
  ru: {
    breadcrumb: "Контакты",
    getInTouch: "Связаться с нами",
    heading: "Мы будем рады услышать вас",
    intro: "Нужен ли вам расчёт стоимости сертификации, есть вопрос по соответствию требованиям или вы хотите записаться на инспекцию — наша команда готова помочь.",
    regionalOffices: "Региональные офисы",
    sendMessage: "Отправить сообщение",
    responseNote: "Обычно мы отвечаем в течение одного рабочего дня.",
    tbd: "(скоро)",
    offices: ["Головной офис", "СЕРИНС Россия", "СЕРИНС Казахстан", "СЕРИНС Индия", "СЕРИНС Вьетнам", "СЕРИНС Китай", "СЕРИНС Узбекистан"],
  },
  kk: {
    breadcrumb: "Байланыс",
    getInTouch: "Бізбен байланысыңыз",
    heading: "Сізден хабар күтеміз",
    intro: "Сертификаттау бағасы, сәйкестік бойынша сұрақ немесе тексеруге жазылу — қандай мәселе болса да, біздің команда көмектесуге дайын.",
    regionalOffices: "Аймақтық кеңселер",
    sendMessage: "Хабарлама жіберу",
    responseNote: "Әдетте бір жұмыс күні ішінде жауап береміз.",
    tbd: "(жақында)",
    offices: ["Бас кеңсе", "CERINS Ресей", "CERINS Қазақстан", "CERINS Үндістан", "CERINS Вьетнам", "CERINS Қытай", "CERINS Өзбекстан"],
  },
  vi: {
    breadcrumb: "Liên hệ",
    getInTouch: "Liên hệ với chúng tôi",
    heading: "Chúng tôi rất mong nhận được tin từ bạn",
    intro: "Dù bạn cần báo giá chứng nhận, có câu hỏi về tuân thủ hay muốn đặt lịch kiểm tra — đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ.",
    regionalOffices: "Văn phòng khu vực",
    sendMessage: "Gửi tin nhắn",
    responseNote: "Chúng tôi thường phản hồi trong vòng 1 ngày làm việc.",
    tbd: "(sắp có)",
    offices: ["Trụ sở chính", "CERINS Nga", "CERINS Kazakhstan", "CERINS Ấn Độ", "CERINS Việt Nam", "CERINS Trung Quốc", "CERINS Uzbekistan"],
  },
};

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = locale as LocaleCode;

  const page = await getPageWithTranslation("contact", code);
  if (!page) notFound();

  const currentUser = await getCurrentUser();
  const member = currentUser
    ? {
        name: currentUser.login_id,
        email: currentUser.email,
        company: currentUser.company ?? "",
        country: currentUser.country ?? "",
        jobTitle: currentUser.job_title ?? "",
      }
    : null;

  const t = T[code];

  return (
    <>
      <PageHero
        title={page.translation.title}
        subtitle={page.translation.subtitle}
        breadcrumb={t.breadcrumb}
        image={page.translation.hero_image}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="bg-white border border-gray-300 shadow-md rounded-xl p-8 space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-0.5 bg-(--brand)" />
                <span className="text-xs font-bold text-(--brand) uppercase tracking-widest">{t.getInTouch}</span>
              </div>
              <h2 className="text-2xl font-bold text-(--brand) mb-3">{t.heading}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{t.intro}</p>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.regionalOffices}</p>
              <OfficeItem label={t.offices[0]} {...CONTACT_DIRECTORY[0]} tbd={t.tbd} />
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {CONTACT_DIRECTORY.slice(1).map((office, i) => (
                  <OfficeItem key={t.offices[i + 1]} label={t.offices[i + 1]} {...office} tbd={t.tbd} />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-300 shadow-md rounded-xl p-8">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-(--brand)">{t.sendMessage}</h3>
              <p className="text-sm text-gray-400 mt-1">{t.responseNote}</p>
            </div>
            <ContactForm member={member} />
          </div>
        </div>
      </div>
    </>
  );
}

function OfficeItem({
  label,
  email,
  tel,
  tbd,
}: {
  label: string;
  email: string | null;
  tel: string;
  tbd: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-(--brand)">{label}</p>
      {email ? (
        <a href={`mailto:${email}`} className="block text-xs text-gray-500 hover:text-(--brand) transition-colors">
          {email}
        </a>
      ) : (
        <p className="text-xs text-gray-400">{tbd}</p>
      )}
      <a href={`tel:${tel.replace(/\s/g, "")}`} className="block text-xs text-gray-500 hover:text-(--brand) transition-colors">
        {tel}
      </a>
    </div>
  );
}
