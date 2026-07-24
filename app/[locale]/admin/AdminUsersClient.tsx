"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  USER_LEVELS,
  USER_LEVEL_LABELS,
  type AccountType,
  type UserLevelKey,
} from "@/src/lib/userTypes";
import { locales } from "@/src/mocks/locales";
import type { User } from "@/src/lib/types";
import { common, confirmDelete } from "@/src/lib/adminMessages";
import { useAdminLocale } from "@/src/lib/useAdminLocale";

interface Props {
  currentUserId: number;
}

interface EditState {
  email: string;
  account_type: AccountType;
  user_level: number;
  email_consent: boolean;
  password: string;
}

const LEVEL_OPTIONS = (Object.keys(USER_LEVELS) as UserLevelKey[]).map((k) => ({
  key: k,
  value: USER_LEVELS[k],
  label: USER_LEVEL_LABELS[k],
}));

const COUNTRY_LABEL: Record<string, string> = Object.fromEntries(
  locales.map((l) => [l.code, l.native_name]),
);

function countryLabel(code: string | null): string {
  if (!code) return "-";
  return COUNTRY_LABEL[code] ?? code.toUpperCase();
}

// 관리자가 로그인해 둔 웹메일에서 "작성" 창을 열고 받는사람을 채워 준다.
// - 아웃룩: 웹 작성 딥링크로 받는사람(to) 자동입력.
// - 한비로: 해시 라우팅 SPA라 URL로 받는사람 자동입력이 어려움 → 주소를 클립보드에 복사한 뒤
//   작성창을 열어 붙여넣기(Ctrl+V) 하게 한다.
const HANBIRO_COMPOSE_URL = "https://cerins.hanbiro.net/ngw/app/#/mail/writeIn/all/";

function sendVia(provider: "hanbiro" | "outlook", emails: string[]): void {
  if (emails.length === 0) return;
  // 받는사람은 항상 클립보드에 복사 → URL이 브라우저 상한(~2000자)을 넘어도 붙여넣기로 커버.
  void navigator.clipboard?.writeText(emails.join(", "));

  const base =
    provider === "outlook"
      ? "https://outlook.office.com/mail/deeplink/compose"
      : HANBIRO_COMPOSE_URL;
  const to = encodeURIComponent(emails.join(provider === "outlook" ? ";" : ","));
  const withTo = `${base}?to=${to}`;
  // 자동입력은 URL이 상한 안에 들 때만. 넘으면 빈 작성창 + 클립보드 붙여넣기.
  window.open(withTo.length > 1900 ? base : withTo, "_blank", "noopener");
}

function dateOnly(s: string | null): string {
  return s ? s.slice(0, 10) : "-";
}

type SortKey =
  | "id"
  | "login_id"
  | "email"
  | "country"
  | "account_type"
  | "user_level"
  | "email_consent"
  | "created_at";
type SortDir = "asc" | "desc";

export default function AdminUsersClient({ currentUserId }: Props) {
  const loc = useAdminLocale();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // 검색 / 필터 / 정렬
  const [query, setQuery] = useState("");
  const [fAccount, setFAccount] = useState<AccountType | "all">("all");
  const [fLevel, setFLevel] = useState<number | "all">("all");
  const [fConsent, setFConsent] = useState<"all" | "yes" | "no">("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = (await res.json()) as { users?: User[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "사용자 목록을 불러오지 못했습니다.");
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "id" || key === "created_at" ? "desc" : "asc");
    }
  }

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = users.filter((u) => {
      if (fAccount !== "all" && u.account_type !== fAccount) return false;
      if (fLevel !== "all" && u.user_level !== fLevel) return false;
      if (fConsent !== "all") {
        const want = fConsent === "yes";
        if (u.email_consent !== want) return false;
      }
      if (q) {
        const hay = [
          u.login_id,
          u.email,
          u.company ?? "",
          u.job_title ?? "",
          u.country ?? "",
          countryLabel(u.country),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case "email_consent":
          av = a.email_consent ? 1 : 0;
          bv = b.email_consent ? 1 : 0;
          break;
        case "user_level":
        case "id":
          av = a[sortKey];
          bv = b[sortKey];
          break;
        case "country":
          av = countryLabel(a.country);
          bv = countryLabel(b.country);
          break;
        default:
          av = String(a[sortKey] ?? "");
          bv = String(b[sortKey] ?? "");
      }
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
    return list;
  }, [users, query, fAccount, fLevel, fConsent, sortKey, sortDir]);

  // 발송 대상 선택은 이메일 수신 동의 회원만 가능.
  const selectableIds = useMemo(
    () => view.filter((u) => u.email_consent).map((u) => u.id),
    [view],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function sendBulk(provider: "hanbiro" | "outlook") {
    const emails = users
      .filter((u) => selected.has(u.id) && u.email_consent)
      .map((u) => u.email);
    if (emails.length === 0) {
      setError("선택된 수신 동의 회원이 없습니다.");
      return;
    }
    sendVia(provider, emails);
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setEditState({
      email: u.email,
      account_type: u.account_type,
      user_level: u.user_level,
      email_consent: u.email_consent,
      password: "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  async function saveEdit(id: number) {
    if (!editState) return;
    setSavingId(id);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        email: editState.email,
        account_type: editState.account_type,
        user_level: editState.user_level,
        email_consent: editState.email_consent,
      };
      if (editState.password.length > 0) body.password = editState.password;
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      cancelEdit();
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  async function removeUser(u: User) {
    if (u.id === currentUserId) return;
    if (!confirm(confirmDelete(loc, u.login_id))) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
  }

  const filterActive =
    query.trim() !== "" ||
    fAccount !== "all" ||
    fLevel !== "all" ||
    fConsent !== "all";

  return (
    <div className="space-y-4">
      {/* 상단 툴바: 검색 + 필터 (왼쪽) / 회원 추가 (오른쪽) */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px] space-y-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="회원 검색 (아이디 · 이메일 · 회사 · 직위 · 국적)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            <FilterSelect
              label="회원 구분"
              value={fAccount}
              onChange={(v) => setFAccount(v as AccountType | "all")}
              options={[
                { value: "all", label: "전체" },
                ...ACCOUNT_TYPES.map((t) => ({
                  value: t,
                  label: ACCOUNT_TYPE_LABELS[t],
                })),
              ]}
            />
            <FilterSelect
              label="레벨"
              value={fLevel === "all" ? "all" : String(fLevel)}
              onChange={(v) => setFLevel(v === "all" ? "all" : Number(v))}
              options={[
                { value: "all", label: "전체" },
                ...LEVEL_OPTIONS.map((o) => ({
                  value: String(o.value),
                  label: `${o.label} (${o.value})`,
                })),
              ]}
            />
            <FilterSelect
              label="이메일 수신"
              value={fConsent}
              onChange={(v) => setFConsent(v as "all" | "yes" | "no")}
              options={[
                { value: "all", label: "전체" },
                { value: "yes", label: "동의" },
                { value: "no", label: "미동의" },
              ]}
            />
            {filterActive && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFAccount("all");
                  setFLevel("all");
                  setFConsent("all");
                }}
                className="text-xs text-gray-500 hover:text-(--brand) underline self-center"
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 hover:opacity-90 whitespace-nowrap"
        >
          {showCreate ? "닫기" : "+ 회원 추가"}
        </button>
      </div>

      {showCreate && (
        <CreateUserPanel
          onCreated={async () => {
            setShowCreate(false);
            await load();
          }}
          onCancel={() => setShowCreate(false)}
          onError={setError}
        />
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-xs text-gray-400">
        한비로 · 아웃룩 버튼은 작성창을 열며 받는사람을 자동 입력합니다. 받는사람이 많아
        자동 입력이 안 되면, 클립보드에 복사된 주소를 받는사람 칸에 붙여넣기(Ctrl+V) 하세요.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            사용자 목록{" "}
            <span className="text-gray-400 font-normal">
              {filterActive
                ? `(${view.length} / 총 ${users.length}명)`
                : `(총 ${users.length}명)`}
            </span>
          </h2>
          <button
            type="button"
            onClick={load}
            className="text-xs text-(--brand) hover:underline"
          >
            새로고침
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <SortTh k="id" label="ID" {...{ sortKey, sortDir, toggleSort }} />
                <SortTh
                  k="login_id"
                  label="아이디"
                  {...{ sortKey, sortDir, toggleSort }}
                />
                <SortTh
                  k="email"
                  label="이메일"
                  {...{ sortKey, sortDir, toggleSort }}
                />
                <SortTh
                  k="country"
                  label="국적"
                  {...{ sortKey, sortDir, toggleSort }}
                />
                <SortTh
                  k="account_type"
                  label="회원 구분"
                  {...{ sortKey, sortDir, toggleSort }}
                />
                <SortTh
                  k="user_level"
                  label="레벨"
                  {...{ sortKey, sortDir, toggleSort }}
                />
                <SortTh
                  k="created_at"
                  label="가입일"
                  {...{ sortKey, sortDir, toggleSort }}
                />
                <Th className="text-right pr-5">작업</Th>
                <Th>
                  <div className="flex flex-col items-center gap-0.5">
                    <span>이메일 수신</span>
                    <label className="inline-flex items-center gap-1 text-[10px] font-normal normal-case text-gray-500">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-3.5 w-3.5 accent-(--brand)"
                      />
                      전체
                    </label>
                  </div>
                </Th>
                <Th>
                  <div className="flex flex-col items-center gap-0.5">
                    <span>이메일 발송</span>
                    <span className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => sendBulk("hanbiro")}
                        className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] font-normal normal-case hover:bg-gray-50"
                        title="선택한 사람들에게 한비로로 발송(BCC)"
                      >
                        한비로
                      </button>
                      <button
                        type="button"
                        onClick={() => sendBulk("outlook")}
                        className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] font-normal normal-case hover:bg-gray-50"
                        title="선택한 사람들에게 아웃룩으로 발송(BCC)"
                      >
                        아웃룩
                      </button>
                    </span>
                  </div>
                </Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center py-6 text-gray-400">
                    {common(loc).loading}
                  </td>
                </tr>
              )}
              {!loading && view.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-6 text-gray-400">
                    {users.length === 0
                      ? "사용자가 없습니다."
                      : "조건에 맞는 사용자가 없습니다."}
                  </td>
                </tr>
              )}
              {view.map((u) => {
                const isEditing = editingId === u.id;
                const isSaving = savingId === u.id;
                return (
                  <tr key={u.id} className="border-t border-gray-100 align-top">
                    <Td className="text-gray-500">{u.id}</Td>
                    <Td className="font-semibold text-gray-800">
                      {u.login_id}
                      {u.id === currentUserId && (
                        <span className="ml-1 text-[10px] text-(--brand)">(나)</span>
                      )}
                    </Td>
                    <Td>
                      {isEditing && editState ? (
                        <input
                          type="email"
                          value={editState.email}
                          onChange={(e) =>
                            setEditState({ ...editState, email: e.target.value })
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="text-gray-700">{u.email}</span>
                      )}
                    </Td>
                    <Td className="text-gray-700">{countryLabel(u.country)}</Td>
                    <Td>
                      {isEditing && editState ? (
                        <select
                          value={editState.account_type}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              account_type: e.target.value as AccountType,
                            })
                          }
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          {ACCOUNT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {ACCOUNT_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-700">
                          {ACCOUNT_TYPE_LABELS[u.account_type]}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {isEditing && editState ? (
                        <select
                          value={editState.user_level}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              user_level: Number(e.target.value),
                            })
                          }
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          {LEVEL_OPTIONS.map((o) => (
                            <option key={o.key} value={o.value}>
                              {o.label} ({o.value})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-700">
                          {levelLabel(u.user_level)} ({u.user_level})
                        </span>
                      )}
                    </Td>
                    <Td className="text-gray-500 text-xs whitespace-nowrap">
                      {dateOnly(u.created_at)}
                      {isEditing && editState && (
                        <div className="mt-2">
                          <input
                            type="password"
                            value={editState.password}
                            onChange={(e) =>
                              setEditState({ ...editState, password: e.target.value })
                            }
                            placeholder="새 비밀번호 (선택)"
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        </div>
                      )}
                    </Td>
                    <Td className="text-right pr-5 whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => saveEdit(u.id)}
                            className="rounded bg-(--brand) text-white px-3 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                          >
                            {isSaving ? common(loc).saving : common(loc).save}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
                          >
                            {common(loc).cancel}
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(u)}
                            className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
                          >
                            {common(loc).edit}
                          </button>
                          <button
                            type="button"
                            disabled={u.id === currentUserId}
                            onClick={() => removeUser(u)}
                            className="rounded border border-red-300 text-red-600 px-3 py-1 text-xs hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {common(loc).delete}
                          </button>
                        </div>
                      )}
                    </Td>
                    <Td className="text-center">
                      {isEditing && editState ? (
                        <input
                          type="checkbox"
                          checked={editState.email_consent}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              email_consent: e.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-(--brand)"
                          title="이메일 수신 동의 (수정)"
                        />
                      ) : u.email_consent ? (
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="h-4 w-4 accent-(--brand)"
                          title="발송 대상 선택"
                        />
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </Td>
                    <Td className="text-center whitespace-nowrap">
                      {u.email_consent ? (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => sendVia("hanbiro", [u.email])}
                            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            한비로
                          </button>
                          <button
                            type="button"
                            onClick={() => sendVia("outlook", [u.email])}
                            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            아웃룩
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">수신 미동의</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function levelLabel(level: number): string {
  // 가장 낮은 임계값부터 올라가며 매칭. UI 표시 전용.
  let best: UserLevelKey = "user";
  for (const opt of LEVEL_OPTIONS) {
    if (level >= opt.value) best = opt.key;
  }
  return USER_LEVEL_LABELS[best];
}

interface CreatePanelProps {
  onCreated: () => void | Promise<void>;
  onCancel: () => void;
  onError: (msg: string | null) => void;
}

function CreateUserPanel({ onCreated, onCancel, onError }: CreatePanelProps) {
  const t = common(useAdminLocale());
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [userLevel, setUserLevel] = useState<number>(USER_LEVELS.user);
  const [emailConsent, setEmailConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_id: loginId,
          password,
          email,
          email_consent: emailConsent,
          account_type: accountType,
          user_level: userLevel,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        onError(data.error ?? "생성에 실패했습니다.");
        return;
      }
      await onCreated();
    } catch {
      onError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-5 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">새 사용자 추가</h2>
      </div>
      <form onSubmit={onSubmit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="아이디">
          <input
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="영문/숫자/_ 4-32자"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </FormField>
        <FormField label="이메일">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </FormField>
        <FormField label="비밀번호">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8-128자"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </FormField>
        <FormField label="회원 구분">
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="레벨">
          <select
            value={userLevel}
            onChange={(e) => setUserLevel(Number(e.target.value))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.key} value={o.value}>
                {o.label} ({o.value})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="이메일 수신 동의">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emailConsent}
              onChange={(e) => setEmailConsent(e.target.checked)}
              className="h-4 w-4 accent-(--brand)"
            />
            동의
          </label>
        </FormField>
        <div className="md:col-span-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 text-sm px-4 py-2 hover:bg-gray-50"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-(--brand) text-white text-sm font-semibold px-5 py-2 hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? `${t.add}…` : t.add}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className="font-semibold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface SortThProps {
  k: SortKey;
  label: string;
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (k: SortKey) => void;
}

function SortTh({ k, label, sortKey, sortDir, toggleSort }: SortThProps) {
  const active = sortKey === k;
  return (
    <th className="text-left font-semibold px-4 py-2">
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={
          "inline-flex items-center gap-1 hover:text-(--brand) " +
          (active ? "text-(--brand)" : "")
        }
      >
        <span>{label}</span>
        <span className="text-[9px]">
          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={"text-left font-semibold px-4 py-2 " + (className ?? "")}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-4 py-2 " + (className ?? "")}>{children}</td>;
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
