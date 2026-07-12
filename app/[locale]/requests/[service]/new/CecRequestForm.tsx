"use client";

import { useState } from "react";
import {
  CEC_REQUEST_FILE_TYPES,
  CEC_FILE_META,
  type CecFileType,
} from "@/src/lib/cecTypes";

interface Props {
  defaults: { company_name: string; contact_name: string; contact_email: string };
  detailHrefBase: string;
}

// CEC India 의뢰서. 필수 파일: 최초 구매가 영수증 / 명판 / 제품사진(여러 장 가능).
export default function CecRequestForm({ defaults, detailHrefBase }: Props) {
  const [company, setCompany] = useState(defaults.company_name);
  const [contactName, setContactName] = useState(defaults.contact_name);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(defaults.contact_email);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // 검사 요청 일정(가능일)·현장 담당자(선택). 시작일을 고르면 종료일도 같은 날로 기본 세팅한다.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timeUndecided, setTimeUndecided] = useState(true);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [siteName, setSiteName] = useState("");
  const [sitePhone, setSitePhone] = useState("");
  const [files, setFiles] = useState<Record<CecFileType, File[]>>(
    () =>
      Object.fromEntries(CEC_REQUEST_FILE_TYPES.map((t) => [t, [] as File[]])) as Record<
        CecFileType,
        File[]
      >,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onPick(type: CecFileType, list: FileList | null) {
    setFiles((prev) => ({ ...prev, [type]: list ? Array.from(list) : [] }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // 클라이언트 1차 필수 파일 확인(서버에서 재검증).
    for (const t of CEC_REQUEST_FILE_TYPES) {
      if (CEC_FILE_META[t].required && files[t].length === 0) {
        setError(`${CEC_FILE_META[t].label} 파일은 필수입니다.`);
        return;
      }
    }

    // 검사 요청 정보 필수 확인.
    if (!startDate || !endDate) {
      setError("검사 요청 시작일과 종료일은 필수입니다.");
      return;
    }
    if (endDate < startDate) {
      setError("검사 요청 종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    if (!siteName.trim() || !sitePhone.trim()) {
      setError("현장 담당자명과 연락처는 필수입니다.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("service_type", "CEC_INDIA");
      fd.set("company_name", company);
      fd.set("contact_name", contactName);
      fd.set("contact_phone", phone);
      fd.set("contact_email", email);
      fd.set("title", title);
      fd.set("description", description);
      fd.set("requested_start_date", startDate);
      fd.set("requested_end_date", endDate);
      if (!timeUndecided) {
        fd.set("requested_start_time", startTime);
        fd.set("requested_end_time", endTime);
      }
      fd.set("site_contact_name", siteName);
      fd.set("site_contact_phone", sitePhone);
      for (const t of CEC_REQUEST_FILE_TYPES) {
        for (const f of files[t]) fd.append(`files_${t}`, f);
      }
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
        <h2 className="text-sm font-bold text-gray-800">검사 요청 정보</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="검사 요청 시작일 (가능일)" required>
            <input
              type="date"
              required
              className={inputCls}
              value={startDate}
              onChange={(e) => {
                const v = e.target.value;
                setStartDate(v);
                // 보통 하루 검사라 종료일이 비었거나 시작일보다 빠르면 시작일과 같은 날로 맞춘다.
                if (v && (!endDate || endDate < v)) setEndDate(v);
              }}
            />
          </Field>
          <Field label="검사 요청 종료일" required>
            <input type="date" required className={inputCls} value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={timeUndecided} onChange={(e) => setTimeUndecided(e.target.checked)} />
          시간 미정
        </label>
        {!timeUndecided && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="검사 요청 시작시간">
              <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label="검사 요청 종료시간">
              <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="현장 담당자명" required>
            <input className={inputCls} required value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </Field>
          <Field label="현장 담당자 연락처" required>
            <input className={inputCls} required value={sitePhone} onChange={(e) => setSitePhone(e.target.value)} placeholder="010-0000-0000" />
          </Field>
        </div>
        <p className="text-[11px] text-gray-400">
          검사 가능한 날짜/시간을 알려주시면 접수 후 담당자가 일정을 확정해 드립니다. 하루만 검사하는 경우 시작일과
          종료일을 같은 날짜로 두세요. 시간이 확정되지 않았다면 &quot;시간 미정&quot;을 선택하세요.
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">첨부파일</h2>
        <div className="space-y-3">
          {CEC_REQUEST_FILE_TYPES.map((t) => {
            const meta = CEC_FILE_META[t];
            return (
              <div key={t} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">
                  {meta.label}
                  {meta.required && <span className="text-(--brand)"> *</span>}
                  {t === "CEC_PRODUCT_PHOTO" && <span className="text-gray-400"> (여러 장 가능)</span>}
                </label>
                {t === "CEC_PURCHASE_RECEIPT" && (
                  <span className="text-[11px] text-gray-400">
                    회사 내부 전산자료도 가능합니다. 단, 회사 직인 또는 서명이 포함되어야 합니다.
                  </span>
                )}
                <input
                  type="file"
                  multiple
                  onChange={(e) => onPick(t, e.target.files)}
                  className="text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-gray-200"
                />
                {files[t].length > 0 && (
                  <span className="text-[11px] text-gray-400">{files[t].length}개 선택됨</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400">
          * 최초 구매가 영수증, 명판, 제품사진은 필수입니다. 제품사진은 여러 장 올릴 수 있습니다.
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
