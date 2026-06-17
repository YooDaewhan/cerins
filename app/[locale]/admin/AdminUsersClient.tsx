"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  USER_LEVELS,
  USER_LEVEL_LABELS,
  type AccountType,
  type UserLevelKey,
} from "@/src/lib/userTypes";
import type { User } from "@/src/lib/types";

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

export default function AdminUsersClient({ currentUserId }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

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
    if (!confirm(`'${u.login_id}' 사용자를 삭제하시겠습니까?`)) return;
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

  return (
    <div className="space-y-6">
      <CreateUserSection onCreated={load} onError={setError} />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">사용자 목록</h2>
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
                <Th>ID</Th>
                <Th>아이디</Th>
                <Th>이메일</Th>
                <Th>회원 구분</Th>
                <Th>레벨</Th>
                <Th>이메일 수신</Th>
                <Th>가입일</Th>
                <Th className="text-right pr-5">작업</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-400">
                    불러오는 중...
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-400">
                    사용자가 없습니다.
                  </td>
                </tr>
              )}
              {users.map((u) => {
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
                    <Td>
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
                        />
                      ) : (
                        <span className="text-gray-700">
                          {u.email_consent ? "동의" : "-"}
                        </span>
                      )}
                    </Td>
                    <Td className="text-gray-500 text-xs">
                      {u.created_at}
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
                            {isSaving ? "저장 중..." : "저장"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(u)}
                            className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            disabled={u.id === currentUserId}
                            onClick={() => removeUser(u)}
                            className="rounded border border-red-300 text-red-600 px-3 py-1 text-xs hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            삭제
                          </button>
                        </div>
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

interface CreateSectionProps {
  onCreated: () => void | Promise<void>;
  onError: (msg: string | null) => void;
}

function CreateUserSection({ onCreated, onError }: CreateSectionProps) {
  const [open, setOpen] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [userLevel, setUserLevel] = useState<number>(USER_LEVELS.user);
  const [emailConsent, setEmailConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setLoginId("");
    setPassword("");
    setEmail("");
    setAccountType("personal");
    setUserLevel(USER_LEVELS.user);
    setEmailConsent(false);
  }

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
      reset();
      setOpen(false);
      await onCreated();
    } catch {
      onError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">새 사용자 추가</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-(--brand) hover:underline"
        >
          {open ? "닫기" : "열기"}
        </button>
      </div>
      {open && (
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
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-(--brand) text-white text-sm font-semibold px-5 py-2 hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "추가 중..." : "추가"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={"text-left font-semibold px-4 py-2 " + (className ?? "")}
    >
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
