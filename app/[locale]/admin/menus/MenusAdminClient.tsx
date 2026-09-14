"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LocaleCode } from "@/src/lib/types";
import { menusNotice, common, confirmDelete, confirmDeleteWithChildren } from "@/src/lib/adminMessages";
import MediaInput from "@/components/admin/MediaInput";

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

interface Props {
  locale: LocaleCode;
  isPrimary: boolean;
}

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

export default function MenusAdminClient({ locale, isPrimary }: Props) {
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

  const localeName = useMemo(() => {
    const l = data?.locales.find((x) => x.code === locale);
    return l ? `${l.native_name} (${l.code})` : locale;
  }, [data, locale]);

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
    if (!data || !isPrimary) return;
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
    if (!createDraft || !isPrimary) return;
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
      // Primary(ko) admin can change structure fields + the ko label.
      // Other-language admins only upsert their own locale's label.
      const payload = isPrimary
        ? {
            parent_id: draft.parent_id,
            page_id: draft.page_id,
            url: draft.url,
            mega_image_url: draft.mega_image_url,
            sort_order: draft.sort_order,
            is_visible: draft.is_visible,
            translations: { ko: draft.translations.ko ?? "" },
          }
        : {
            translations: { [locale]: draft.translations[locale] ?? "" },
          };
      const res = await fetch(`/api/admin/menus/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    if (!isPrimary) return;
    const kids = childrenOf.get(m.id) ?? [];
    const label = m.translations.ko ?? m.translations.en ?? `#${m.id}`;
    const warn =
      kids.length > 0
        ? confirmDeleteWithChildren(locale, label, kids.length)
        : confirmDelete(locale, label);
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
    return <p className="text-sm text-gray-500">{common(locale).loading}</p>;
  }
  if (!data) {
    return (
      <p className="text-sm text-red-600">
        {error ?? common(locale).loadError}
      </p>
    );
  }

  const topLevel = childrenOf.get(null) ?? [];

  return (
    <div className="space-y-4">
      {isPrimary ? (
        <div className="rounded-md border border-gray-200 bg-amber-50 px-4 py-3 text-xs text-gray-700">
          <p className="font-semibold mb-1">메뉴 구조 안내 · 한국어 관리자</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-600">
            <li>메뉴 구조(추가·삭제·정렬·링크·노출)와 한국어 라벨은 이 화면에서 관리합니다.</li>
            <li>하위 메뉴가 1개 이상이면 사이트 헤더에서 자동으로 메가패널(드롭다운)로 표시됩니다.</li>
            <li>하위 메뉴가 없으면 단일 링크로 표시됩니다. (예: 문의, 뉴스)</li>
            <li>다른 언어 라벨은 각 언어 관리자 화면에서 번역합니다.</li>
          </ul>
        </div>
      ) : (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-gray-700">
          <p className="font-semibold mb-1">{menusNotice(locale).title}</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-600">
            {menusNotice(locale).bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

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
          {isPrimary && (
            <button
              type="button"
              onClick={() => startCreate(null)}
              className="rounded bg-(--brand) text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
            >
              + 최상위 메뉴 추가
            </button>
          )}
        </div>
      </div>

      {isPrimary && creatingFor === "root" && createDraft && (
        <MenuForm
          title="새 최상위 메뉴"
          locale={locale}
          localeName={localeName}
          isPrimary={isPrimary}
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
            locale={locale}
            localeName={localeName}
            isPrimary={isPrimary}
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
  locale: LocaleCode;
  localeName: string;
  isPrimary: boolean;
  pages: AdminPage[];
  busy: boolean;
}

function displayLabel(menu: AdminMenu, locale: LocaleCode): string {
  return menu.translations[locale] ?? menu.translations.ko ?? `#${menu.id}`;
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
    locale,
    localeName,
    isPrimary,
    pages,
    busy,
  } = props;

  const label = displayLabel(menu, locale);
  const missingTranslation = !isPrimary && !menu.translations[locale];
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
            {missingTranslation && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                미번역
              </span>
            )}
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
          {isPrimary && isParent && (
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
            {common(locale).edit}
          </button>
          {isPrimary && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded border border-red-300 text-red-600 px-2.5 py-1 text-xs hover:bg-red-50"
            >
              {common(locale).delete}
            </button>
          )}
        </div>
      </div>

      {isEditing && draft && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
          <MenuForm
            title={
              isPrimary ? `메뉴 #${menu.id} 수정` : `메뉴 #${menu.id} · ${localeName} 라벨`
            }
            locale={locale}
            localeName={localeName}
            isPrimary={isPrimary}
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
          {isPrimary && createForId === menu.id && createDraft && (
            <MenuForm
              title="새 하위 메뉴"
              locale={locale}
              localeName={localeName}
              isPrimary={isPrimary}
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
            {children.map((c) => {
              const childMissing = !isPrimary && !c.translations[locale];
              return (
                <li
                  key={c.id}
                  className="rounded border border-gray-200 bg-white"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-800 truncate">
                          {displayLabel(c, locale)}
                        </span>
                        {childMissing && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            미번역
                          </span>
                        )}
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
                        {common(locale).edit}
                      </button>
                      {isPrimary && (
                        <button
                          type="button"
                          onClick={() => onChildDelete(c)}
                          className="rounded border border-red-300 text-red-600 px-2 py-0.5 text-[11px] hover:bg-red-50"
                        >
                          {common(locale).delete}
                        </button>
                      )}
                    </div>
                  </div>
                  {editingId === c.id && childDraft && (
                    <div className="border-t border-gray-200 bg-gray-50 px-3 py-3">
                      <MenuForm
                        title={
                          isPrimary
                            ? `메뉴 #${c.id} 수정`
                            : `메뉴 #${c.id} · ${localeName} 라벨`
                        }
                        locale={locale}
                        localeName={localeName}
                        isPrimary={isPrimary}
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
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

interface MenuFormProps {
  title: string;
  locale: LocaleCode;
  localeName: string;
  isPrimary: boolean;
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
  locale,
  localeName,
  isPrimary,
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

      {isPrimary && (
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
            <Field label="메가패널 배경 이미지" className="sm:col-span-2">
              <MediaInput
                url={draft.mega_image_url ?? ""}
                onChange={(v) => patch("mega_image_url", v || null)}
                accept="image/*"
                previewClassName="h-24 w-auto"
                helpText="이미지(png/jpg/gif/webp/svg) 업로드 또는 외부 URL."
              />
            </Field>
          )}
        </div>
      )}

      {!isPrimary && (
        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
          한국어 라벨: <b>{draft.translations.ko ?? "(없음)"}</b>
          {" · "}
          {draft.page_id ? `page#${draft.page_id}` : draft.url ?? "링크 없음"}
        </div>
      )}

      <div>
        {isPrimary ? (
          <>
            <p className="text-xs font-semibold text-gray-700 mb-1.5">
              한국어 라벨
            </p>
            <input
              type="text"
              value={draft.translations.ko ?? ""}
              onChange={(e) => setTrans("ko", e.target.value)}
              placeholder="(필수)"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              한국어 라벨은 필수입니다. 다른 언어 라벨은 각 언어 관리자 화면에서 입력합니다.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-gray-700 mb-1.5">
              {localeName} 라벨
            </p>
            <input
              type="text"
              value={draft.translations[locale] ?? ""}
              onChange={(e) => setTrans(locale, e.target.value)}
              placeholder="(비우면 한국어로 대체)"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          {common(locale).cancel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="rounded bg-(--brand) text-white px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {busy ? common(locale).saving : common(locale).save}
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
