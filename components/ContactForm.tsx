// TODO: move form labels/placeholders/success-text to a `ui_strings` table per locale once admin CRUD lands.
"use client";

import { useState } from "react";
import type { LocaleCode } from "@/src/lib/types";

// 저장값은 항상 한글(canonical) — 관리자에서 한글로 보이게. 표시만 로케일별로 바꾼다.
const CATEGORY_VALUES = ["불편 접수", "추가 요청사항", "기타"] as const;
const CATEGORY_LABELS: Record<LocaleCode, string[]> = {
  ko: ["불편 접수", "추가 요청사항", "기타"],
  en: ["Complaint", "Additional request", "Other"],
  ja: ["不具合の申告", "追加のご要望", "その他"],
  zh: ["问题反馈", "补充需求", "其他"],
  ru: ["Жалоба", "Дополнительный запрос", "Другое"],
  kk: ["Шағым", "Қосымша сұраныс", "Басқа"],
  vi: ["Phản ánh sự cố", "Yêu cầu bổ sung", "Khác"],
};

const UI: Record<LocaleCode, {
  category: string; send: string; sending: string;
  success: string; sendFail: string; networkError: string;
}> = {
  ko: { category: "카테고리", send: "메시지 보내기", sending: "전송 중...", success: "메시지를 보냈습니다. 곧 연락드리겠습니다.", sendFail: "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.", networkError: "네트워크 오류가 발생했습니다." },
  en: { category: "Category", send: "Send Message", sending: "Sending...", success: "Message sent successfully. We'll be in touch soon.", sendFail: "Failed to send. Please try again shortly.", networkError: "A network error occurred." },
  ja: { category: "カテゴリ", send: "メッセージを送る", sending: "送信中...", success: "メッセージを送信しました。まもなくご連絡いたします。", sendFail: "送信に失敗しました。しばらくしてからもう一度お試しください。", networkError: "ネットワークエラーが発生しました。" },
  zh: { category: "类别", send: "发送消息", sending: "发送中...", success: "消息已发送，我们会尽快与您联系。", sendFail: "发送失败，请稍后重试。", networkError: "发生网络错误。" },
  ru: { category: "Категория", send: "Отправить сообщение", sending: "Отправка...", success: "Сообщение отправлено. Мы скоро свяжемся с вами.", sendFail: "Не удалось отправить. Повторите попытку позже.", networkError: "Произошла сетевая ошибка." },
  kk: { category: "Санат", send: "Хабарлама жіберу", sending: "Жіберілуде...", success: "Хабарлама жіберілді. Жақында хабарласамыз.", sendFail: "Жіберу сәтсіз аяқталды. Сәлден соң қайталаңыз.", networkError: "Желі қатесі орын алды." },
  vi: { category: "Danh mục", send: "Gửi tin nhắn", sending: "Đang gửi...", success: "Đã gửi tin nhắn. Chúng tôi sẽ liên hệ sớm.", sendFail: "Gửi không thành công. Vui lòng thử lại sau.", networkError: "Đã xảy ra lỗi mạng." },
};

interface Member {
  name: string;
  email: string;
  company: string;
  country: string;
  jobTitle: string;
}

interface FormData {
  category: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  department: string;
  subject: string;
  message: string;
}

export default function ContactForm({
  member,
  locale = "ko",
}: {
  member?: Member | null;
  locale?: LocaleCode;
}) {
  const labels = CATEGORY_LABELS[locale] ?? CATEGORY_LABELS.ko;
  const ui = UI[locale] ?? UI.ko;
  const initialForm: FormData = {
    category: CATEGORY_VALUES[0],
    company: member?.company ?? "",
    name: member?.name ?? "",
    email: member?.email ?? "",
    phone: "",
    country: member?.country ?? "",
    department: member?.jobTitle ?? "",
    subject: "",
    message: "",
  };

  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? ui.sendFail);
        return;
      }
      setForm({ ...initialForm, subject: "", message: "" });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch {
      setError(ui.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full border border-gray-200 rounded px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-(--brand) transition";
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>{ui.category} *</label>
        <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
          {CATEGORY_VALUES.map((value, i) => (
            <option key={value} value={value}>
              {labels[i]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Company</label>
          <input
            type="text"
            name="company"
            value={form.company}
            onChange={handleChange}
            placeholder="Your company name"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>ID *</label>
          <input
            type="text"
            name="name"
            required
            readOnly={!!member}
            value={form.name}
            onChange={handleChange}
            placeholder="Your account ID"
            className={inputClass + (member ? " bg-gray-100 text-gray-500" : "")}
          />
        </div>
      </div>

      {/* 국가·직위(department): 입력칸 없이 회원정보 값을 그대로 저장 */}
      <input type="hidden" name="country" value={form.country} />
      <input type="hidden" name="department" value={form.department} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Email *</label>
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="your@email.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="+82-2-1234-5678"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Subject *</label>
        <input
          type="text"
          name="subject"
          required
          value={form.subject}
          onChange={handleChange}
          placeholder="How can we help?"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Message *</label>
        <textarea
          name="message"
          required
          rows={6}
          value={form.message}
          onChange={handleChange}
          placeholder="Please describe your inquiry in detail..."
          className={inputClass + " resize-none"}
        />
      </div>

      {submitted && (
        <p className="text-sm text-green-600 font-medium">{ui.success}</p>
      )}
      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-8 py-3 bg-(--brand) text-white text-sm font-semibold rounded hover:bg-[#0d2a5a] transition disabled:opacity-60"
      >
        {submitting ? ui.sending : ui.send}
      </button>
    </form>
  );
}
