// TODO: move form labels/placeholders/success-text to a `ui_strings` table per locale once admin CRUD lands.
"use client";

import { useState } from "react";

const CATEGORIES = ["불편 접수", "추가 요청사항", "기타"];

interface Member {
  name: string;
  email: string;
  company: string;
  country: string;
}

interface FormData {
  category: string;
  company: string;
  name: string;
  email: string;
  country: string;
  subject: string;
  message: string;
}

export default function ContactForm({ member }: { member?: Member | null }) {
  const initialForm: FormData = {
    category: CATEGORIES[0],
    company: member?.company ?? "",
    name: member?.name ?? "",
    email: member?.email ?? "",
    country: member?.country ?? "",
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
        setError(data.error ?? "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setForm({ ...initialForm, subject: "", message: "" });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
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
        <label className={labelClass}>Category *</label>
        <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
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

      {/* 국가: 입력칸 없이 회원정보 값을 그대로 저장 */}
      <input type="hidden" name="country" value={form.country} />

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
        <p className="text-sm text-green-600 font-medium">Message sent successfully. We&apos;ll be in touch soon.</p>
      )}
      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-8 py-3 bg-(--brand) text-white text-sm font-semibold rounded hover:bg-[#0d2a5a] transition disabled:opacity-60"
      >
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
