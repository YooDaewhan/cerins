"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminPartner {
  id: number;
  name: string;
  logo: string | null;
  website: string | null;
  sort_order: number;
  is_visible: boolean;
}

type DraftState = Omit<AdminPartner, "id">;

function emptyDraft(sort: number): DraftState {
  return {
    name: "",
    logo: null,
    website: null,
    sort_order: sort,
    is_visible: true,
  };
}

export default function PartnersAdminClient() {
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<DraftState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", { cache: "no-store" });
      const json = (await res.json()) as {
        partners?: AdminPartner[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "파트너를 불러오지 못했습니다.");
        return;
      }
      setPartners(json.partners ?? []);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(p: AdminPartner) {
    setEditingId(p.id);
    setCreating(false);
    setDraft({
      name: p.name,
      logo: p.logo,
      website: p.website,
      sort_order: p.sort_order,
      is_visible: p.is_visible,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    const nextSort =
      partners.length === 0
        ? 1
        : partners[partners.length - 1].sort_order + 1;
    setCreateDraft(emptyDraft(nextSort));
  }

  function cancelCreate() {
    setCreating(false);
    setCreateDraft(null);
  }

  async function saveCreate() {
    if (!createDraft) return;
    if (!createDraft.name.trim()) {
      setError("파트너 이름은 필수입니다.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "추가에 실패했습니다.");
        return;
      }
      cancelCreate();
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (editingId === null || !draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "저장에 실패했습니다.");
        return;
      }
      cancelEdit();
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function removePartner(p: AdminPartner) {
    if (!confirm(`'${p.name}' 파트너를 삭제할까요?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${p.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "삭제에 실패했습니다.");
        return;
      }
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">총 {partners.length}개</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs text-(--brand) hover:underline"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={startCreate}
            className="rounded bg-(--brand) text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
          >
            + 새 파트너
          </button>
        </div>
      </div>

      {creating && createDraft && (
        <PartnerForm
          title="새 파트너"
          draft={createDraft}
          onChange={setCreateDraft}
          onSave={saveCreate}
          onCancel={cancelCreate}
          busy={busy}
        />
      )}

      <ul className="space-y-2">
        {partners.length === 0 && !creating && (
          <li className="rounded border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
            파트너가 없습니다.
          </li>
        )}
        {partners.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-gray-200 bg-white overflow-hidden"
          >
            <div className="flex gap-4 p-3 items-center">
              <div className="w-20 h-16 flex items-center justify-center rounded border border-gray-200 bg-white flex-shrink-0">
                {p.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.logo}
                    alt={p.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-gray-400">로고 없음</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {p.name}
                  </span>
                  {!p.is_visible && (
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                      숨김
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  #{p.id} · sort {p.sort_order}
                  {p.website && (
                    <>
                      {" · "}
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-(--brand) hover:underline"
                      >
                        {p.website}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => removePartner(p)}
                  className="rounded border border-red-300 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            </div>
            {editingId === p.id && draft && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
                <PartnerForm
                  title={`파트너 #${p.id} 수정`}
                  draft={draft}
                  onChange={setDraft}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  busy={busy}
                  inline
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PartnerFormProps {
  title: string;
  draft: DraftState;
  onChange: (d: DraftState) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  inline?: boolean;
}

function PartnerForm({
  title,
  draft,
  onChange,
  onSave,
  onCancel,
  busy,
  inline = false,
}: PartnerFormProps) {
  function patch<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    onChange({ ...draft, [key]: value });
  }
  return (
    <div
      className={
        inline
          ? "space-y-3"
          : "rounded-lg border border-gray-200 bg-white p-4 space-y-3"
      }
    >
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="이름">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => patch("name", e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="웹사이트 URL">
          <input
            type="text"
            value={draft.website ?? ""}
            onChange={(e) => patch("website", e.target.value || null)}
            placeholder="https://..."
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="로고 URL" className="sm:col-span-2">
          <input
            type="text"
            value={draft.logo ?? ""}
            onChange={(e) => patch("logo", e.target.value || null)}
            placeholder="/images/partners/xxx.png 또는 https://..."
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          {draft.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.logo}
              alt=""
              className="mt-2 h-16 w-auto rounded border border-gray-200 object-contain bg-white p-1"
            />
          )}
        </Field>
        <Field label="정렬 순서">
          <input
            type="number"
            value={draft.sort_order}
            onChange={(e) => patch("sort_order", Number(e.target.value) || 0)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="노출 여부">
          <label className="inline-flex items-center gap-2 text-sm pt-1.5">
            <input
              type="checkbox"
              checked={draft.is_visible}
              onChange={(e) => patch("is_visible", e.target.checked)}
              className="h-4 w-4 accent-(--brand)"
            />
            <span>사이트에 표시</span>
          </label>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="rounded bg-(--brand) text-white px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
