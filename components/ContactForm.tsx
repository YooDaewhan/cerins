// TODO: move form labels/placeholders/success-text to a `ui_strings` table per locale once admin CRUD lands.
"use client";

import { useState } from "react";

interface FormData {
  name: string;
  company: string;
  department: string;
  country: string;
  email: string;
  website: string;
  phone: string;
  subject: string;
  message: string;
}

const initialForm: FormData = {
  name: "",
  company: "",
  department: "",
  country: "",
  email: "",
  website: "",
  phone: "",
  subject: "",
  message: "",
};

export default function ContactForm() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setForm(initialForm);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Name *</label>
          <input
            type="text"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="Your full name"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Company</label>
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
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Department</label>
          <input
            type="text"
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder="Your department"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Country *</label>
          <input
            type="text"
            name="country"
            required
            value={form.country}
            onChange={handleChange}
            placeholder="Your country"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email *</label>
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
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Website</label>
          <input
            type="url"
            name="website"
            value={form.website}
            onChange={handleChange}
            placeholder="https://yourcompany.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Phone</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="+82-2-1234-5678"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Subject *</label>
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
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Message *</label>
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
      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}

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

