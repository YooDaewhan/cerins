"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { User } from "@/src/lib/types";

const TiptapEditor = dynamic(
  () => import("@/components/admin/TiptapEditor"),
  { ssr: false },
);

interface Template {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  updated_at: string;
}

interface EmailLog {
  id: number;
  subject: string;
  body_html: string;
  recipients: string[];
  sent_count: number;
  failed_count: number;
  error: string | null;
  sent_by_login: string | null;
  created_at: string;
}

export default function EmailAdminClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 선택 수신자
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");

  // 작성
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);

  // 양식
  const [templateId, setTemplateId] = useState<number | "">("");

  const consenting = useMemo(
    () => users.filter((u) => u.email_consent),
    [users],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return consenting;
    return consenting.filter((u) =>
      [u.login_id, u.email, u.company ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [consenting, query]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [uRes, tRes, lRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/email/templates", { cache: "no-store" }),
        fetch("/api/admin/email/logs", { cache: "no-store" }),
      ]);
      const uData = (await uRes.json()) as { users?: User[]; error?: string };
      const tData = (await tRes.json()) as { templates?: Template[] };
      const lData = (await lRes.json()) as { logs?: EmailLog[] };
      if (!uRes.ok) {
        setError(uData.error ?? "데이터를 불러오지 못했습니다.");
        return;
      }
      setUsers(uData.users ?? []);
      setTemplates(tData.templates ?? []);
      setLogs(lData.logs ?? []);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((u) => selected.has(u.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((u) => next.delete(u.id));
      else filtered.forEach((u) => next.add(u.id));
      return next;
    });
  }

  function applyTemplate(id: number) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBodyHtml(t.body_html);
  }

  async function saveTemplate(asNew: boolean) {
    const existing = asNew ? null : templates.find((t) => t.id === templateId);
    const name = window.prompt(
      "양식 이름",
      existing?.name ?? subject ?? "",
    );
    if (!name) return;
    setError(null);
    try {
      const url = existing
        ? `/api/admin/email/templates/${existing.id}`
        : "/api/admin/email/templates";
      const res = await fetch(url, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, body_html: bodyHtml }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "양식 저장에 실패했습니다.");
        return;
      }
      setNotice("양식을 저장했습니다.");
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
  }

  async function deleteTemplate() {
    if (templateId === "") return;
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    if (!confirm(`'${t.name}' 양식을 삭제하시겠습니까?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/email/templates/${t.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      setTemplateId("");
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
  }

  async function send() {
    setError(null);
    setNotice(null);
    const ids = [...selected];
    if (ids.length === 0) {
      setError("수신자를 선택하세요.");
      return;
    }
    if (!subject.trim()) {
      setError("제목을 입력하세요.");
      return;
    }
    if (!confirm(`${ids.length}명에게 메일을 발송하시겠습니까?`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: ids,
          subject,
          body_html: bodyHtml,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        sent?: number;
        failed?: number;
        total?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "발송에 실패했습니다.");
        return;
      }
      setNotice(
        `발송 완료: 성공 ${data.sent}건 / 실패 ${data.failed}건 (대상 ${data.total}명)`,
      );
      setSelected(new Set());
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* 수신자 선택 (수신 동의 회원만) */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden self-start">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              수신자{" "}
              <span className="text-gray-400 font-normal">
                (선택 {selected.size} / 동의 {consenting.length}명)
              </span>
            </h3>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-(--brand) hover:underline"
            >
              {allFilteredSelected ? "전체 해제" : "전체 선택"}
            </button>
          </div>
          <div className="p-3 border-b border-gray-100">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="아이디 · 이메일 · 회사 검색"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                수신 동의한 회원이 없습니다.
              </p>
            )}
            {filtered.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggle(u.id)}
                  className="h-4 w-4 accent-(--brand)"
                />
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-800">{u.login_id}</span>
                  <span className="block text-xs text-gray-500 truncate">
                    {u.email}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 작성 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {/* 양식 */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={templateId}
              onChange={(e) => {
                const v = e.target.value === "" ? "" : Number(e.target.value);
                setTemplateId(v);
                if (v !== "") applyTemplate(v);
              }}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
            >
              <option value="">양식 선택…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => saveTemplate(true)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              새 양식 저장
            </button>
            <button
              type="button"
              disabled={templateId === ""}
              onClick={() => saveTemplate(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-40"
            >
              선택 양식 덮어쓰기
            </button>
            <button
              type="button"
              disabled={templateId === ""}
              onClick={deleteTemplate}
              className="rounded border border-red-300 text-red-600 px-3 py-1.5 text-xs hover:bg-red-50 disabled:opacity-40"
            >
              양식 삭제
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              본문
            </label>
            <TiptapEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="메일 본문을 입력하세요…"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={sending}
              onClick={send}
              className="rounded-md bg-(--brand) text-white text-sm font-semibold px-5 py-2 hover:opacity-90 disabled:opacity-60"
            >
              {sending ? "발송 중..." : `선택 ${selected.size}명에게 발송`}
            </button>
          </div>
        </div>
      </div>

      {/* 발송 로그 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">발송 로그</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left font-semibold px-4 py-2">제목</th>
                <th className="text-left font-semibold px-4 py-2">수신자</th>
                <th className="text-left font-semibold px-4 py-2">결과</th>
                <th className="text-left font-semibold px-4 py-2">발송자</th>
                <th className="text-left font-semibold px-4 py-2">일시</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">
                    발송 기록이 없습니다.
                  </td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-800">{l.subject}</td>
                  <td
                    className="px-4 py-2 text-gray-600"
                    title={l.recipients.join(", ")}
                  >
                    {l.recipients.length}명
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-green-700">성공 {l.sent_count}</span>
                    {l.failed_count > 0 && (
                      <span className="text-red-600 ml-2" title={l.error ?? ""}>
                        실패 {l.failed_count}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {l.sent_by_login ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {l.created_at}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
