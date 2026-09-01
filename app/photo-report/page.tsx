'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  REPORTS,
  dropGroup,
  expandPhotoEntries,
  filledRows,
  type Field,
  type FormValues,
  type PhotoEntry,
} from '@/src/lib/reportForms';
import SignaturePad from '@/components/SignaturePad';
import { KO } from '@/src/lib/reportFormsKo';
import { ZH } from '@/src/lib/reportFormsZh';
import { VI } from '@/src/lib/reportFormsVi';

type Status = { type: 'error' | 'success'; message: string } | null;

const TABS = [...REPORTS.map(r => ({ id: r.id, label: r.label })), { id: 'upload', label: 'Upload' }];

// 화면 라벨용 사전. en 은 영문 원문 그대로라 사전이 없다.
const LANGS = [
  { id: 'ko', label: '한', dict: KO },
  { id: 'en', label: 'EN', dict: null },
  { id: 'zh', label: '中', dict: ZH },
  { id: 'vi', label: 'VI', dict: VI },
] as const;
type Lang = (typeof LANGS)[number]['id'];

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

// ── 작성 중인 입력값 보관. 현장에서 폰 브라우저가 꺼져도 이어서 쓸 수 있게 한다.
// 사진·동영상(File)은 직렬화가 안 되므로 저장되지 않는다.
const DRAFT_KEY = 'photo-report-draft';

interface Draft {
  tab: string;
  lang: string;
  reporterName: string;
  values: Record<string, FormValues>;
  gridRows: Record<string, number>;
  catLabels: Record<string, string>;
  groupNames: Record<string, string>;
  groupCount: Record<string, number>;
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null; // 시크릿 모드·용량 초과 등은 저장 없이 그냥 쓴다
  }
}

function saveDraft(d: Draft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* 저장 못 해도 입력은 계속된다 */
  }
}

export default function PhotoReportPage() {
  const [lang, setLang] = useState<Lang>('ko');
  const [tab, setTab] = useState(TABS[0].id);
  const [values, setValues] = useState<Record<string, FormValues>>({});
  const [gridRows, setGridRows] = useState<Record<string, number>>({});
  const [reporterName, setReporterName] = useState('');
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  // 항목별 사진 / 캡션. key = `${tab}.${항목 index}`
  const [catPhotos, setCatPhotos] = useState<Record<string, File[]>>({});
  const [catLabels, setCatLabels] = useState<Record<string, string>>({});
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [groupCount, setGroupCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  // 자동 이동이 막히는 브라우저를 대비해, 직접 누를 수 있는 링크도 남겨 둔다.
  const [download, setDownload] = useState<{ url: string; filename: string } | null>(null);
  // 저장해 둔 입력값을 다 읽기 전에는 저장하지 않는다(빈 값으로 덮어쓰는 걸 막는다).
  const [restored, setRestored] = useState(false);

  // 오늘 날짜 기본값 + 이전에 저장해 둔 입력값 복원.
  // SSR/CSR 이 어긋나 hydration 이 깨지지 않도록 둘 다 마운트 후에 넣는다.
  useEffect(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const defaults: Record<string, FormValues> = {};
    for (const r of REPORTS) {
      for (const s of r.sections) {
        for (const f of s.fields) {
          if (f.t !== 'text' || !f.today) continue;
          defaults[r.id] = { ...(defaults[r.id] ?? {}), [f.k]: today };
        }
      }
    }

    const saved = loadDraft();
    setValues(() => {
      const merged = { ...defaults };
      for (const [id, v] of Object.entries(saved?.values ?? {})) {
        merged[id] = { ...(merged[id] ?? {}), ...v };
      }
      return merged;
    });
    if (saved) {
      if (saved.tab && TABS.some(x => x.id === saved.tab)) setTab(saved.tab);
      if (saved.lang && LANGS.some(l => l.id === saved.lang)) setLang(saved.lang as Lang);
      setReporterName(saved.reporterName ?? '');
      setGridRows(saved.gridRows ?? {});
      setCatLabels(saved.catLabels ?? {});
      setGroupNames(saved.groupNames ?? {});
      setGroupCount(saved.groupCount ?? {});
    }
    setRestored(true);
  }, []);

  // 입력할 때마다 이 기기에 저장한다. 폰에서 브라우저가 꺼져도 값이 남는다.
  useEffect(() => {
    if (!restored) return;
    saveDraft({ tab, lang, reporterName, values, gridRows, catLabels, groupNames, groupCount });
  }, [restored, tab, lang, reporterName, values, gridRows, catLabels, groupNames, groupCount]);

  /** 저장된 입력값을 지우고 화면을 처음 상태로 되돌린다. */
  function resetDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* 저장 못 하는 환경은 그냥 넘어간다 */ }
    location.reload();
  }

  // 화면 라벨만 번역한다. 생성되는 Word 파일은 원본 영문 양식 그대로다.
  const dict = LANGS.find(l => l.id === lang)?.dict;
  const t = (s: string) => dict?.[s] ?? s;

  const def = REPORTS.find(r => r.id === tab);
  const cats = def?.photoCategories;
  const grp = def?.photoGroup;
  const videoAt = def?.videoAt;
  // fill 이 걸린 묶음(SCRAP 컨테이너)은 표에 입력한 행 수만큼 사진 묶음도 따라 생긴다.
  const groups = grp?.fill
    ? Math.max(1, filledRows(values[tab]?.[grp.fill.grid]))
    : groupCount[tab] ?? 1;

  // 반복 묶음(CEC 의 물품 단위)을 펼쳐, 화면에 보이는 순서 = 캡션 번호 순서로 만든다.
  const entries = def ? expandPhotoEntries(def, groups) : [];

  /** 캡션 기본값. 물품 이름과 표에 입력한 번호(컨테이너·봉인)를 자동으로 넣는다. */
  function autoLabel(e: PhotoEntry) {
    if (!grp || e.gi < 0) return e.label;
    if (e.ci === grp.nameAt) {
      const n = (groupNames[groupKey(e.gi)] ?? '').trim();
      if (n) return `${e.label}-${n}`;
    }
    const col = grp.fill?.at[e.ci];
    if (grp.fill && col !== undefined) {
      const rows = (values[tab]?.[grp.fill.grid] as string[][] | undefined) ?? [];
      const v = (rows[e.gi]?.[col] ?? '').trim();
      // 'Container (No. )' → 'Container (No. ABCD1234)'
      if (v) return e.label.replace(/\)\s*$/, `${v})`);
    }
    return e.label;
  }

  /** 캡션에 쓸 이름. 사용자가 직접 고친 값이 있으면 그대로 쓴다. */
  function entryLabel(e: PhotoEntry) {
    return catLabels[catKey(e.key)] ?? autoLabel(e);
  }
  const current = values[tab] ?? {};

  function setValue(k: string, v: FormValues[string]) {
    setValues(prev => ({ ...prev, [tab]: { ...(prev[tab] ?? {}), [k]: v } }));
  }

  function visibleRows(f: Extract<Field, { t: 'grid' }>) {
    const want = gridRows[`${tab}.${f.k}`] ?? Math.min(3, f.rows.length);
    // rowBlock 인 표는 입력한 행 수만큼 문서에 생기므로 템플릿 행 수 제한이 없다.
    return f.rowBlock ? want : Math.min(want, f.rows.length);
  }

  function setCellValue(f: Extract<Field, { t: 'grid' }>, r: number, c: number, v: string) {
    const grid = ((current[f.k] as string[][] | undefined) ?? []).map(row => [...row]);
    while (grid.length <= r) grid.push([]);
    while (grid[r].length <= c) grid[r].push('');
    grid[r][c] = v;
    setValue(f.k, grid);
  }

  const catKey = (k: string) => `${tab}.${k}`;
  const groupKey = (gi: number) => `${tab}.item#${gi}`;

  /** 물품 묶음 하나를 지우고, 딸린 사진·이름과 뒤 묶음 번호를 함께 정리한다. */
  function removeGroup(gi: number) {
    setCatPhotos(m => dropGroup(m, tab, gi));
    setCatLabels(m => dropGroup(m, tab, gi));
    setGroupNames(m => dropGroup(m, tab, gi));
    setGroupCount(p => ({ ...p, [tab]: Math.max(1, groups - 1) }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setDownload(null);

    if (!reporterName.trim()) {
      setStatus({ type: 'error', message: '이름을 입력해주세요.' });
      return;
    }
    if (!def && !docxFile) {
      setStatus({ type: 'error', message: '기본 Word 파일(.docx)을 선택해주세요.' });
      return;
    }
    if (!def && photoFiles.length === 0) {
      setStatus({ type: 'error', message: '사진을 최소 1장 선택해주세요.' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('reportType', tab);
      formData.append('reporterName', reporterName.trim());
      if (def) formData.append('values', JSON.stringify(current));
      else if (docxFile) formData.append('docx', docxFile);

      // 사진은 항목 순서대로 이어붙이고, 같은 순서의 캡션 배열을 함께 보낸다.
      const labels: string[] = [];
      if (cats) {
        entries.forEach((entry, i) => {
          const isVideo = entry.ci === videoAt;
          for (const file of catPhotos[catKey(entry.key)] ?? []) {
            if (isVideo) {
              // 동영상은 Word 에 못 넣으므로 zip 에 따로 담아 보낸다.
              formData.append('videos', file);
              continue;
            }
            formData.append('photos', file);
            labels.push(entryLabel(entry));
          }
        });
      } else {
        for (const photo of photoFiles) {
          formData.append('photos', photo);
          labels.push(photo.name);
        }
      }
      formData.append('labels', JSON.stringify(labels));

      const res = await fetch('/api/photo-report', { method: 'POST', body: formData });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ message: '알 수 없는 오류' }));
        throw new Error(json.message ?? '서버 오류가 발생했습니다.');
      }

      // 서버가 파일을 보관하고 링크만 준다. 일반 GET 이라야 폰에서도 확실히 저장된다.
      const { url, filename } = (await res.json()) as { url: string; filename: string };
      setDownload({ url, filename });
      location.href = url;

      setStatus({ type: 'success', message: '보고서 생성 완료! 다운로드가 시작됩니다.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다.';
      console.error('[photo-report]', err);
      setStatus({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }

  function renderField(f: Field) {
    if (f.t === 'text') {
      const v = (current[f.k] as string) ?? '';
      return (
        <label key={f.k} className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">{t(f.label)}</span>
          {f.lines && f.lines > 1 ? (
            <textarea
              rows={f.lines}
              value={v}
              placeholder={f.ph}
              onChange={e => setValue(f.k, e.target.value)}
              className={inputCls}
            />
          ) : (
            <input
              type={f.date ? 'date' : 'text'}
              value={v}
              placeholder={f.ph}
              onChange={e => setValue(f.k, e.target.value)}
              className={inputCls}
            />
          )}
        </label>
      );
    }

    if (f.t === 'sign') {
      return (
        <div key={f.k}>
          <span className="block text-sm font-medium text-gray-700 mb-1">{t(f.label)}</span>
          {/* 캔버스는 값이 아니라 자기 픽셀을 들고 있다. 탭을 바꾸거나 저장값을 복원하면
              같은 자리에 다른 서명이 남지 않도록 새로 그리게 한다. */}
          <SignaturePad
            key={`${tab}.${restored}`}
            value={(current[f.k] as string) ?? ''}
            onChange={v => setValue(f.k, v)}
            clearLabel={t('Clear signature')}
            hint={t('Sign here with your mouse or finger.')}
          />
        </div>
      );
    }

    if (f.t === 'radio') {
      const v = (current[f.k] as string) ?? '';
      return (
        <div key={f.k}>
          <span className="block text-sm font-medium text-gray-700 mb-1">{t(f.label)}</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {f.opts.map(o => (
              <label key={o.v} className="flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="radio"
                  name={`${tab}.${f.k}`}
                  checked={v === o.v}
                  onChange={() => setValue(f.k, o.v)}
                />
                {t(o.label)}
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (f.t === 'checks') {
      const v = (current[f.k] as string[]) ?? [];
      return (
        <div key={f.k}>
          <span className="block text-sm font-medium text-gray-700 mb-1">{t(f.label)}</span>
          <div className="flex flex-col gap-1.5">
            {f.opts.map(o => (
              <label key={o.v} className="flex items-start gap-1.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={v.includes(o.v)}
                  onChange={e =>
                    setValue(f.k, e.target.checked ? [...v, o.v] : v.filter(x => x !== o.v))
                  }
                />
                {t(o.label)}
              </label>
            ))}
          </div>
        </div>
      );
    }

    const shown = visibleRows(f);
    const grid = (current[f.k] as string[][]) ?? [];
    return (
      <div key={f.k}>
        <span className="block text-sm font-medium text-gray-700 mb-1">{t(f.label)}</span>
        {/* 화면에서는 한 행을 카드로 풀어 세로로 쌓는다. 가로 스크롤 없음.
            Word 출력은 원본 표 형식 그대로 유지된다. */}
        <div className="space-y-2">
          {Array.from({ length: shown }, (_, r) => (
            <div key={r} className="border border-gray-200 rounded-lg p-3">
              {f.rows.length > 1 && (
                <span className="block text-xs font-semibold text-gray-400 mb-2">#{r + 1}</span>
              )}
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {f.cols.map((c, i) => (
                  <label key={c} className="block">
                    <span className="block text-xs text-gray-500 mb-0.5">{t(c)}</span>
                    <input
                      type={f.dateCols?.includes(i) ? 'date' : 'text'}
                      value={grid[r]?.[i] ?? ''}
                      onChange={e => setCellValue(f, r, i, e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {(f.rowBlock || shown < f.rows.length) && (
          <button
            type="button"
            onClick={() => setGridRows(p => ({ ...p, [`${tab}.${f.k}`]: shown + 1 }))}
            className="mt-1 text-xs text-blue-600 hover:underline"
          >
            {t('+ add row')} ({shown}{f.rowBlock ? '' : `/${f.rows.length}`})
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-4xl mx-auto p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{t('Inspection Report Builder')}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/photo-report/admin"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                {t('Admin page')}
              </Link>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs font-semibold">
                {LANGS.map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLang(l.id)}
                    className={`px-3 py-1.5 transition-colors ${
                      lang === l.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t('Fill in the form, attach photos, and download the Word report.')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map(tb => (
            <button
              key={tb.id}
              type="button"
              onClick={() => { setTab(tb.id); setStatus(null); }}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg -mb-px border-b-2 transition-colors ${
                tab === tb.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(tb.label)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 저장 파일명(날짜_형식_이름)에 들어가는 작성자 이름. 필수. */}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              {t('Report name')} <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              required
              value={reporterName}
              onChange={e => setReporterName(e.target.value)}
              placeholder={t('e.g. 유지환')}
              className={inputCls}
            />
            <span className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
              <span>{t('Saved as: 260828_Inspection Report_name')}</span>
              <button type="button" onClick={resetDraft} className="shrink-0 text-red-500 hover:underline">
                {t('Reset form')}
              </button>
            </span>
            <span className="mt-1 block text-xs text-gray-400">
              {t('Entries are kept on this device, so you can close the browser and come back. Photos are not kept.')}
            </span>
          </label>

          {def ? (
            <>
              <p className="text-sm text-gray-400">{t(def.title)}</p>
              {def.sections.map(s => (
                <fieldset key={s.title} className="border border-gray-200 rounded-xl p-4 space-y-4">
                  <legend className="px-2 text-sm font-bold text-gray-700">{t(s.title)}</legend>
                  {s.fields.map(renderField)}
                </fieldset>
              ))}
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Base Word file')} <span className="text-gray-400">(.docx)</span>
              </label>
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={e => setDocxFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {docxFile && <p className="mt-1 text-xs text-gray-400 truncate">{t('Selected')}: {docxFile.name}</p>}
            </div>
          )}

          {/* Photos */}
          <fieldset className="border border-gray-200 rounded-xl p-4 space-y-3">
            <legend className="px-2 text-sm font-bold text-gray-700">{t('Photos')}</legend>
            <p className="text-xs text-gray-400">{t('jpg / jpeg / png / webp, multiple allowed')}</p>

            {cats ? (
              entries.map((entry, i) => {
                const key = catKey(entry.key);
                const files = catPhotos[key] ?? [];
                const inGroup = grp && entry.gi >= 0;
                const isVideo = entry.ci === videoAt;
                return (
                  <div key={entry.key}>
                    {inGroup && entry.ci === grp!.from && (
                      <div className="flex items-center gap-2 mt-3 mb-1.5">
                        <span className="text-xs font-bold text-gray-500 shrink-0">
                          {t(grp!.label)} {entry.gi + 1}
                        </span>
                        {grp!.nameAt !== undefined ? (
                          <input
                            type="text"
                            value={groupNames[groupKey(entry.gi)] ?? ''}
                            placeholder={t('Goods name')}
                            onChange={e =>
                              setGroupNames(p => ({ ...p, [groupKey(entry.gi)]: e.target.value }))
                            }
                            className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        ) : (
                          <span className="flex-1" />
                        )}
                        {groups > 1 && !grp!.fill && (
                          <button
                            type="button"
                            onClick={() => removeGroup(entry.gi)}
                            className="shrink-0 text-xs text-red-500 hover:underline"
                          >
                            {t('delete')}
                          </button>
                        )}
                      </div>
                    )}
                    <div className={`border border-gray-200 rounded-lg p-3 ${inGroup ? 'ml-3 border-l-2 border-l-blue-200' : ''}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-gray-400 w-5 shrink-0">{i + 1}.</span>
                        <input
                          type="text"
                          value={entryLabel(entry)}
                          onChange={e => setCatLabels(p => ({ ...p, [key]: e.target.value }))}
                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                      <input
                        type="file"
                        accept={isVideo ? 'video/*' : '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'}
                        multiple
                        onChange={e =>
                          setCatPhotos(p => ({ ...p, [key]: e.target.files ? Array.from(e.target.files) : [] }))
                        }
                        className={`block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium cursor-pointer ${
                          isVideo
                            ? 'file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100'
                            : 'file:bg-green-50 file:text-green-700 hover:file:bg-green-100'
                        }`}
                      />
                      {isVideo && (
                        <p className="mt-1 text-xs text-gray-400">{t('Videos are delivered in a zip with the Word file, not inside it.')}</p>
                      )}
                      {files.length > 0 && (
                        <p className="mt-1 text-xs text-gray-400">{files.length}{t(' file(s) selected')}</p>
                      )}
                    </div>
                    {inGroup && !grp!.fill && entry.ci === grp!.to && entry.gi === groups - 1 && (
                      <button
                        type="button"
                        onClick={() => setGroupCount(p => ({ ...p, [tab]: groups + 1 }))}
                        className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        {t('+ add {x}').replace('{x}', t(grp!.label))}
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={e => setPhotoFiles(e.target.files ? Array.from(e.target.files) : [])}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
                />
                {photoFiles.length > 0 && (
                  <p className="mt-1 text-xs text-gray-400">{photoFiles.length}{t(' file(s) selected')}</p>
                )}
              </>
            )}
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('Generating…') : t('Done – download Word file')}
          </button>

          {download && (
            <a
              href={download.url}
              download={download.filename}
              className="block rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              {t('Download did not start? Tap here')}
              <span className="mt-0.5 block text-xs font-normal text-blue-500">{download.filename}</span>
            </a>
          )}

          {status && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-medium ${
                status.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {status.message}
            </div>
          )}
        </form>

        <p className="text-xs text-gray-400 text-center">
          {t('The generated report is stored on the server; admins can download it again from the admin page.')}
        </p>
      </div>
    </main>
  );
}
