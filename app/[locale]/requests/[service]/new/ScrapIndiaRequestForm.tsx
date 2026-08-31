"use client";

import { useState } from "react";

interface Props {
  defaults: { company_name: string; contact_name: string; contact_email: string };
  detailHrefBase: string;
}

// 검사 → 스크랩(인도) 의뢰서. step 0 에서는 파일을 받지 않고 검사 요청 일정/장소/현장 담당자를 입력한다.
// 시간이 미정이면 "시간 미정"을 선택해 시간 필드를 비워둘 수 있다.
export default function ScrapIndiaRequestForm({ defaults, detailHrefBase }: Props) {
  const [company, setCompany] = useState(defaults.company_name);
  const [contactName, setContactName] = useState(defaults.contact_name);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(defaults.contact_email);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [startDate, setStartDate] = useState("");
  const [timeUndecided, setTimeUndecided] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [siteName, setSiteName] = useState("");
  const [sitePhone, setSitePhone] = useState("");
  const [requestNote, setRequestNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!startDate) {
      setError("검사 요청일은 필수입니다.");
      return;
    }
    if (!location.trim()) {
      setError("검사 장소는 필수입니다.");
      return;
    }
    if (!siteName.trim() || !sitePhone.trim()) {
      setError("현장 담당자명과 연락처는 필수입니다.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("service_type", "SCRAP_INDIA");
      fd.set("company_name", company);
      fd.set("contact_name", contactName);
      fd.set("contact_phone", phone);
      fd.set("contact_email", email);
      fd.set("title", title);
      fd.set("description", description);
      fd.set("requested_start_date", startDate);
      if (!timeUndecided) fd.set("requested_start_time", startTime);
      fd.set("requested_location", location);
      fd.set("requested_location_detail", locationDetail);
      fd.set("site_contact_name", siteName);
      fd.set("site_contact_phone", sitePhone);
      fd.set("request_note", requestNote);
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
          <textarea className={`${inputCls} min-h-28`} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </Field>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">검사 요청 정보</h2>
        <Field label="검사 요청일" required>
          <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={timeUndecided} onChange={(e) => setTimeUndecided(e.target.checked)} />
          시간 미정
        </label>
        {!timeUndecided && (
          <Field label="검사 요청 시간">
            <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
        )}
        <Field label="검사 장소" required>
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} required />
        </Field>
        <Field label="검사 장소 상세주소">
          <input className={inputCls} value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="현장 담당자명" required>
            <input className={inputCls} required value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </Field>
          <Field label="현장 담당자 연락처" required>
            <input className={inputCls} required value={sitePhone} onChange={(e) => setSitePhone(e.target.value)} placeholder="010-0000-0000" />
          </Field>
        </div>
        <Field label="검사 관련 요청사항">
          <textarea className={`${inputCls} min-h-20`} value={requestNote} onChange={(e) => setRequestNote(e.target.value)} />
        </Field>
        <p className="text-[11px] text-gray-400">
          시간이 확정되지 않았다면 &quot;시간 미정&quot;을 선택하세요.
          검사 후 제출 서류는 현장검사 완료 후 마이페이지에서 업로드하시면 됩니다.
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
