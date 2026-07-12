"use client";

import { useState } from "react";

interface Props {
  defaults: { company_name: string; contact_name: string; contact_email: string };
  detailHrefBase: string;
}

// 제품검사 의뢰서. 필수 파일: 제품사진(여러 장 가능, 이미지 형식).
export default function ProductInspectionRequestForm({ defaults, detailHrefBase }: Props) {
  const [company, setCompany] = useState(defaults.company_name);
  const [contactName, setContactName] = useState(defaults.contact_name);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(defaults.contact_email);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // 클라이언트 1차 필수 파일 확인(서버에서 재검증).
    if (photos.length === 0) {
      setError("제품사진은 최소 1개 이상 필수입니다.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("service_type", "PRODUCT_INSPECTION");
      fd.set("company_name", company);
      fd.set("contact_name", contactName);
      fd.set("contact_phone", phone);
      fd.set("contact_email", email);
      fd.set("title", title);
      fd.set("description", description);
      for (const f of photos) fd.append("files_PRODUCT_INSPECTION_PHOTO", f);
      const res = await fetch("/api/requests", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; id?: number; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "제출에 실패했습니다.");
        return;
      }
      window.location.assign(`${detailHrefBase}/${data.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">기본 정보</h2>
        <Field label="회사명" required>
          <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} required />
        </Field>
        <Field label="담당자 이름" required>
          <input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        </Field>
        <Field label="연락처" required>
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="010-0000-0000" />
        </Field>
        <Field label="이메일" required>
          <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">의뢰 내용</h2>
        <Field label="의뢰 제목" required>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="의뢰 내용" required>
          <textarea className={`${inputCls} min-h-32`} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </Field>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">제품사진</h2>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">
            제품사진<span className="text-(--brand)"> *</span>
            <span className="text-gray-400"> (여러 장 가능, 이미지 파일)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(e.target.files ? Array.from(e.target.files) : [])}
            className="text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-gray-200"
          />
          {photos.length > 0 && (
            <span className="text-[11px] text-gray-400">{photos.length}개 선택됨</span>
          )}
        </div>
        <p className="text-[11px] text-gray-400">
          * 제품사진은 최소 1개 이상 필수이며 여러 장 올릴 수 있습니다. 이미지 형식(png/jpg/webp 등)만 허용됩니다.
        </p>
      </section>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">{error}</div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-(--brand) text-white text-sm font-semibold px-5 py-2.5 hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "제출 중..." : "의뢰 제출"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-(--brand) focus:outline-none";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
        {required && <span className="text-(--brand)"> *</span>}
      </label>
      {children}
    </div>
  );
}
