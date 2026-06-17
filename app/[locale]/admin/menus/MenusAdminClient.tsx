"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LocaleCode } from "@/src/lib/types";

interface AdminMenu {
  id: number;
  parent_id: number | null;
  page_id: number | null;
  url: string | null;
  mega_image_url: string | null;
  sort_order: number;
  is_visible: boolean;
  translations: Partial<Record<LocaleCode, string>>;
}

interface AdminPage {
  id: number;
  slug: string;
  template: string;
  label: string | null;
}

interface AdminLocale {
  code: LocaleCode;
  name: string;
  native_name: string;
  is_enabled: boolean;
  sort_order: number;
}

interface ApiData {
  menus: AdminMenu[];
  pages: AdminPage[];
  locales: AdminLocale[];
}

type DraftState = Omit<AdminMenu, "id">;

function emptyDraft(parent_id: number | null, nextSort: number): DraftState {
  return {
    parent_id,
    page_id: null,
    url: null,
    mega_image_url: null,
    sort_order: nextSort,
    is_visible: true,
    translations: {},
  };
}

export default function MenusAdminClient() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [creatingFor, setCreatingFor] = useState<number | null | "root">(null);
  const [createDraft, setCreateDraft] = useState<DraftState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/menus", { cache: "no-store" });
      const json = (await res.json()) as ApiData & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "메뉴를 불러오지 못했습니다.");
        return;
      }
      setData(json);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const childrenOf = useMemo(() => {
    const map = new Map<number | null, AdminMenu[]>();
    if (!data) return map;
    for (const m of data.menus) {
      const arr = map.get(m.parent_id) ?? [];
      arr.push(m);
      map.set(m.parent_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    }
    return map;
  }, [data]);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEdit(m: AdminMenu) {
    setEditingId(m.id);
    setCreatingFor(null);
    setDraft({
      parent_id: m.parent_id,
      page_id: m.page_id,
      url: m.url,
      mega_image_url: m.mega_image_url,
      sort_order: m.sort_order,
      is_visible: m.is_visible,
      translations: { ...m.translations },
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function startCreate(parent_id: number | null) {
    if (!data) return;
    setEditingId(null);
    setCreatingFor(parent_id ?? "root");
    const siblings = childrenOf.get(parent_id) ?? [];
    const nextSort =
      siblings.length === 0
        ? parent_id === null
          ? 10
          : 1
        : siblings[siblings.length - 1].sort_order + 10;
    setCreateDraft(emptyDraft(parent_id, nextSort));
    if (parent_id !== null) {
      setExpanded((prev) => new Set(prev).add(parent_id));
    }
  }

  function cancelCreate() {
    setCreatingFor(null);
    setCreateDraft(null);
  }

  async function saveCreate() {
    if (!createDraft) return;
    const ko = (createDraft.translations.ko ?? "").trim();
    if (!ko) {
      setError("한국어 라벨은 필수입니다.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/menus", {
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
      const res = await fetch(`/api/admin/menus/${editingId}`, {
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

  async function removeMenu(m: AdminMenu) {
    const kids = childrenOf.get(m.id) ?? [];
    const label = m.translations.ko ?? m.translations.en ?? `#${m.id}`;
    const warn =
      kids.length > 0
        ? `'${label}' 및 하위 ${kids.length}개 메뉴를 함께 삭제합니다. 계속할까요?`
        : `'${label}' 메뉴를 삭제할까요?`;
    if (!confirm(warn)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/menus/${m.id}`, { method: "DELETE" });
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

  if (loading) {
    return <p className="text-sm text-gray-500">불러오는 중...</p>;
  }
  if (!data) {
    return (
      <p className="text-sm text-red-600">
        {error ?? "메뉴를 불러올 수 없습니다."}
      </p>
    );
  }

  const topLevel = childrenOf.get(null) ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-gray-200 bg-amber-50 px-4 py-3 text-xs text-gray-700">
        <p className="font-semibold mb-1">메뉴 구조 안내</p>
        <ul className="list-disc list-inside space-y-0.5 text-gray-600">
          <li>하위 메뉴가 1개 이상이면 사이트 헤더에서 자동으로 메가패널(드롭다운)로 표시됩니다.</li>
          <li>하위 메뉴가 없으면 단일 링크로 표시됩니다. (예: 문의, 뉴스)</li>
          <li>메가패널 배경 이미지는 최상위 메뉴에만 적용됩니다.</li>
          <li>각 메뉴는 등록된 페이지를 선택하거나 직접 URL을 입력할 수 있습니다. 페이지 선택이 우선합니다.</li>
        </ul>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">총 {data.menus.length}개 메뉴</p>
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
            onClick={() => startCreate(null)}
            className="rounded bg-(--brand) text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
          >
            + 최상위 메뉴 추가
          </button>
        </div>
      </div>

      {creatingFor === "root" && createDraft && (
        <MenuForm
          title="새 최상위 메뉴"
          locales={data.locales}
          pages={data.pages}
          isTopLevel={true}
          draft={createDraft}
          onChange={setCreateDraft}
          onSave={saveCreate}
          onCancel={cancelCreate}
          busy={busy}
        />
      )}

      <ul className="space-y-2">
        {topLevel.map((m) => (
          <MenuRow
            key={m.id}
            menu={m}
            children={childrenOf.get(m.id) ?? []}
            isExpanded={expanded.has(m.id)}
            onToggle={() => toggleExpand(m.id)}
            isEditing={editingId === m.id}
            draft={editingId === m.id ? draft : null}
            onDraftChange={setDraft}
            onStartEdit={() => startEdit(m)}
            onCancelEdit={cancelEdit}
            onSaveEdit={saveEdit}
            onDelete={() => removeMenu(m)}
            onAddChild={() => startCreate(m.id)}
            createForId={creatingFor}
            createDraft={createDraft}
            onCreateDraftChange={setCreateDraft}
            onSaveCreate={saveCreate}
            onCancelCreate={cancelCreate}
            startChildEdit={startEdit}
            editingId={editingId}
            childDraft={draft}
            onChildDraftChange={setDraft}
            onChildCancelEdit={cancelEdit}
            onChildSaveEdit={saveEdit}
            onChildDelete={removeMenu}
            locales={data.locales}
            pages={data.pages}
            busy={busy}
          />
        ))}
      </ul>
    </div>
  );
}

interface MenuRowProps {
  menu: AdminMenu;
  children: AdminMenu[];
  isExpanded: boolean;
  onToggle: () => void;
  isEditing: boolean;
  draft: DraftState | null;
  onDraftChange: (d: DraftState) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  createForId: number | null | "root";
  createDraft: DraftState | null;
  onCreateDraftChange: (d: DraftState) => void;
  onSaveCreate: () => void;
  onCancelCreate: () => void;
  startChildEdit: (m: AdminMenu) => void;
  editingId: number | null;
  childDraft: DraftState | null;
  onChildDraftChange: (d: DraftState) => void;
  onChildCancelEdit: () => void;
  onChildSaveEdit: () => void;
  onChildDelete: (m: AdminMenu) => void;
  locales: AdminLocale[];
  pages: AdminPage[];
  busy: boolean;
}

function MenuRow(props: MenuRowProps) {
  const {
    menu,
    children,
    isExpanded,
    onToggle,
    isEditing,
    draft,
    onDraftChange,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDelete,
    onAddChild,
    createForId,
    createDraft,
    onCreateDraftChange,
    onSaveCreate,
    onCancelCreate,
    startChildEdit,
    editingId,
    childDraft,
    onChildDraftChange,
    onChildCancelEdit,
    onChildSaveEdit,
    onChildDelete,
    locales,
    pages,
    busy,
  } = props;

  const label = menu.translations.ko ?? menu.translations.en ?? `#${menu.id}`;
  const isParent = menu.parent_id === null;
  const childCount = children.length;
  const target = menu.page_id
    ? `page#${menu.page_id}`
    : menu.url ?? "(링크 없음)";

  return (
    <li className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        {isParent && (
          <button
            type="button"
            onClick={onToggle}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-(--brand)"
            aria-label="펼치기"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 truncate">
              {label}
            </span>
            {!menu.is_visible && (
              <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                숨김
              </span>
            )}
            {isParent && childCount > 0 && (
              <span className="text-[10px] bg-(--brand)/10 text-(--brand) px-1.5 py-0.5 rounded">
                메가패널 · 하위 {childCount}
              </span>
            )}
            {isParent && childCount === 0 && (
              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                단일 링크
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            #{menu.id} · sort {menu.sort_order} · {target}
          </div>
        </div>
        <div className="flex gap-1">
          {isParent && (
            <button
              type="button"
              onClick={onAddChild}
              className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
            >
              + 하위
            </button>
          )}
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
          >
            수정
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded border border-red-300 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>

      {isEditing && draft && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
          <MenuForm
            title={`메뉴 #${menu.id} 수정`}
            locales={locales}
            pages={pages}
            isTopLevel={isParent}
            draft={draft}
            onChange={onDraftChange}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
            busy={busy}
            inline
          />
        </div>
      )}

      {isParent && isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
          {createForId === menu.id && createDraft && (
            <MenuForm
              title="새 하위 메뉴"
              locales={locales}
              pages={pages}
              isTopLevel={false}
              draft={createDraft}
              onChange={onCreateDraftChange}
              onSave={onSaveCreate}
              onCancel={onCancelCreate}
              busy={busy}
              inline
            />
          )}
          {children.length === 0 && createForId !== menu.id && (
            <p className="text-xs text-gray-400 px-2 py-3">
              하위 메뉴 없음. (단일 링크로 표시됨)
            </p>
          )}
          <ul className="space-y-1.5">
            {children.map((c) => (
              <li
                key={c.id}
                className="rounded border border-gray-200 bg-white"
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800 truncate">
                        {c.translations.ko ?? c.translations.en ?? `#${c.id}`}
                      </span>
                      {!c.is_visible && (
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          숨김
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                      #{c.id} · sort {c.sort_order} ·{" "}
                      {c.page_id ? `page#${c.page_id}` : c.url ?? "(링크 없음)"}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startChildEdit(c)}
                      className="rounded border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => onChildDelete(c)}
                      className="rounded border border-red-300 text-red-600 px-2 py-0.5 text-[11px] hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {editingId === c.id && childDraft && (
                  <div className="border-t border-gray-200 bg-gray-50 px-3 py-3">
                    <MenuForm
                      title={`메뉴 #${c.id} 수정`}
                      locales={locales}
                      pages={pages}
                      isTopLevel={false}
                      draft={childDraft}
                      onChange={onChildDraftChange}
                      onSave={onChildSaveEdit}
                      onCancel={onChildCancelEdit}
                      busy={busy}
                      inline
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

interface MenuFormProps {
  title: string;
  locales: AdminLocale[];
  pages: AdminPage[];
  isTopLevel: boolean;
  draft: DraftState;
  onChange: (d: DraftState) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  inline?: boolean;
}

function MenuForm({
  title,
  locales,
  pages,
  isTopLevel,
  draft,
  onChange,
  onSave,
  onCancel,
  busy,
  inline = false,
}: MenuFormProps) {
  function patch<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    onChange({ ...draft, [key]: value });
  }
  function setTrans(code: LocaleCode, label: string) {
    onChange({
      ...draft,
      translations: { ...draft.translations, [code]: label },
    });
  }

  return (
    <div
      className={
        inline
          ? "space-y-3"
          : "rounded-lg border border-gray-200 bg-white p-4 space-y-3"
      }
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="연결할 페이지">
          <select
            value={draft.page_id ?? ""}
            onChange={(e) =>
              patch("page_id", e.target.value === "" ? null : Number(e.target.value))
            }
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
          >
            <option value="">(없음)</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label ?? p.slug} ({p.slug})
              </option>
            ))}
          </select>
        </Field>
        <Field label="또는 직접 URL">
          <input
            type="text"
            value={draft.url ?? ""}
            onChange={(e) => patch("url", e.target.value || null)}
            placeholder="/path 또는 https://..."
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
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
        {isTopLevel && (
          <Field label="메가패널 배경 이미지 URL" className="sm:col-span-2">
            <input
              type="text"
              value={draft.mega_image_url ?? ""}
              onChange={(e) => patch("mega_image_url", e.target.value || null)}
              placeholder="https://..."
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
            {draft.mega_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.mega_image_url}
                alt=""
                className="mt-2 h-24 w-auto rounded border border-gray-200 object-cover"
              />
            )}
          </Field>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-700 mb-1.5">언어별 라벨</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {locales.map((l) => (
            <div key={l.code} className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-500 w-8 uppercase">
                {l.code}
              </span>
              <input
                type="text"
                value={draft.translations[l.code] ?? ""}
                onChange={(e) => setTrans(l.code, e.target.value)}
                placeholder={l.code === "ko" ? "(필수)" : "(선택)"}
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          한국어 라벨은 필수입니다. 다른 언어가 비어 있으면 한국어로 대체됩니다.
        </p>
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
