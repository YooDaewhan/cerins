"use client";

import { useState } from "react";
import {
  SATISFACTION_ITEMS,
  STAFF_EVAL_ITEMS,
  RATING_MAX,
  type ReviewKind,
  type RatingItem,
} from "@/src/lib/reviewTypes";
import { USER_LEVELS } from "@/src/lib/userTypes";

export interface FeedbackUser {
  login_id: string;
  email: string;
  user_level: number;
  company?: string | null;
  job_title?: string | null;
}

interface Props {
  currentUser: FeedbackUser | null;
  // 직원이 아닌 방문자(고객/비로그인)를 문의 페이지로 보낼 때 사용할 경로.
  contactHref: string;
}

// 평가 팝업은 직원 전용. 그 외(고객/비로그인)는 설문 없이 문의 페이지로 이동.
export default function FeedbackButton({ currentUser, contactHref }: Props) {
  const [open, setOpen] = useState(false);

  const isStaff = currentUser?.user_level === USER_LEVELS.staff;

  const arrow = (
    <svg
      className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );

  const className =
    "group inline-flex items-center gap-2 px-6 py-3 bg-(--brand) hover:opacity-90 text-white text-sm font-bold tracking-wider uppercase rounded-full transition-opacity";

  // 고객/비로그인: 만족도 설문 팝업 없이 문의 페이지로 이동.
  if (!isStaff) {
    return (
      <a href={contactHref} className={className}>
        Contact Us
        {arrow}
      </a>
    );
  }

  // 직원: 직원 평가 팝업.
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Staff Evaluation
        {arrow}
      </button>

      {open && currentUser && (
        <FeedbackModal
          kind="staff"
          currentUser={currentUser}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function FeedbackModal({
  kind,
  currentUser,
  onClose,
}: {
  kind: ReviewKind;
  currentUser: FeedbackUser;
  onClose: () => void;
}) {
  const items: RatingItem[] = kind === "staff" ? STAFF_EVAL_ITEMS : SATISFACTION_ITEMS;
  const heading = kind === "staff" ? "Staff Evaluation" : "Customer Satisfaction";
  const endpoint = kind === "staff" ? "/api/reviews/staff" : "/api/reviews/satisfaction";

  const [name, setName] = useState(currentUser.login_id);
  const [company, setCompany] = useState(currentUser.company ?? "");
  const [department, setDepartment] = useState(currentUser.job_title ?? "");
  const [email, setEmail] = useState(currentUser.email);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (Object.keys(ratings).length === 0) {
      setError("Please select at least one rating.");
      return;
    }
    setSubmitting(true);
    try {
      const payload =
        kind === "staff"
          ? { name, department, ratings, comment }
          : { name, company, email, ratings, comment };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Submission failed. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("A network error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-(--brand)">{heading}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center space-y-3">
            <div className="text-4xl">🙏</div>
            <p className="text-base font-semibold text-(--brand)">Thank you for your feedback!</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-md bg-(--brand) text-white text-sm font-semibold px-6 py-2.5 hover:opacity-90"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>
              {kind === "staff" ? (
                <Field label="Department">
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Your department"
                    className={inputClass}
                  />
                </Field>
              ) : (
                <Field label="Company">
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company name"
                    className={inputClass}
                  />
                </Field>
              )}
              {kind === "satisfaction" && (
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <StarRow
                    value={ratings[item.key] ?? 0}
                    onChange={(v) => setRatings((prev) => ({ ...prev, [item.key]: v }))}
                  />
                </div>
              ))}
            </div>

            <Field label="Comments">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Share your feedback..."
                className={inputClass + " resize-none"}
              />
            </Field>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-(--brand) text-white text-sm font-semibold py-3 hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="p-0.5"
        >
          <svg
            className={"w-6 h-6 " + (n <= value ? "text-[#f5b301]" : "text-gray-300")}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.36 4.18a1 1 0 00.95.69h4.4c.97 0 1.37 1.24.59 1.81l-3.56 2.59a1 1 0 00-.36 1.12l1.36 4.18c.3.92-.76 1.69-1.54 1.12l-3.56-2.59a1 1 0 00-1.18 0l-3.56 2.59c-.78.57-1.84-.2-1.54-1.12l1.36-4.18a1 1 0 00-.36-1.12L1.4 9.61c-.78-.57-.38-1.81.59-1.81h4.4a1 1 0 00.95-.69L9.05 2.93z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand) focus:border-transparent";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
