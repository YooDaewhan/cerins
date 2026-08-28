'use client';

import { useState } from 'react';
import { REPORTS, type Field, type FormValues } from '@/src/lib/reportForms';

type Status = { type: 'error' | 'success'; message: string } | null;

const TABS = [...REPORTS.map(r => ({ id: r.id, label: r.label })), { id: 'upload', label: '직접 업로드' }];

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

export default function PhotoReportPage() {
  const [tab, setTab] = useState(TABS[0].id);
  const [values, setValues] = useState<Record<string, FormValues>>({});
  const [gridRows, setGridRows] = useState<Record<string, number>>({});
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [columns, setColumns] = useState(3);
  const [rows, setRows] = useState(4);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const def = REPORTS.find(r => r.id === tab);
  const current = values[tab] ?? {};

  function setValue(k: string, v: FormValues[string]) {
    setValues(prev => ({ ...prev, [tab]: { ...(prev[tab] ?? {}), [k]: v } }));
  }

  function visibleRows(f: Extract<Field, { t: 'grid' }>) {
    return Math.min(gridRows[`${tab}.${f.k}`] ?? Math.min(3, f.rows.length), f.rows.length);
  }

  function setCellValue(f: Extract<Field, { t: 'grid' }>, r: number, c: number, v: string) {
    const grid = ((current[f.k] as string[][] | undefined) ?? []).map(row => [...row]);
    while (grid.length <= r) grid.push([]);
    while (grid[r].length <= c) grid[r].push('');
    grid[r][c] = v;
    setValue(f.k, grid);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

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
      formData.append('columns', String(columns));
      formData.append('rows', String(rows));
      if (def) formData.append('values', JSON.stringify(current));
      else if (docxFile) formData.append('docx', docxFile);
      for (const photo of photoFiles) formData.append('photos', photo);

      const res = await fetch('/api/photo-report', { method: 'POST', body: formData });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ message: '알 수 없는 오류' }));
        throw new Error(json.message ?? '서버 오류가 발생했습니다.');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${def ? def.id : 'report'}_${Date.now()}.docx`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

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
          <span className="block text-sm font-medium text-gray-700 mb-1">{f.label}</span>
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
              type="text"
              value={v}
              placeholder={f.ph}
              onChange={e => setValue(f.k, e.target.value)}
              className={inputCls}
            />
          )}
        </label>
      );
    }

    if (f.t === 'radio') {
      const v = (current[f.k] as string) ?? '';
      return (
        <div key={f.k}>
          <span className="block text-sm font-medium text-gray-700 mb-1">{f.label}</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {f.opts.map(o => (
              <label key={o.v} className="flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="radio"
                  name={`${tab}.${f.k}`}
                  checked={v === o.v}
                  onChange={() => setValue(f.k, o.v)}
                />
                {o.label}
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
          <span className="block text-sm font-medium text-gray-700 mb-1">{f.label}</span>
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
                {o.label}
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
        <span className="block text-sm font-medium text-gray-700 mb-1">{f.label}</span>
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
                    <span className="block text-xs text-gray-500 mb-0.5">{c}</span>
                    <input
                      type="text"
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
        {shown < f.rows.length && (
          <button
            type="button"
            onClick={() => setGridRows(p => ({ ...p, [`${tab}.${f.k}`]: shown + 1 }))}
            className="mt-1 text-xs text-blue-600 hover:underline"
          >
            + 행 추가 ({shown}/{f.rows.length})
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-4xl mx-auto p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">검사 보고서 생성</h1>
          <p className="mt-1 text-sm text-gray-500">
            양식을 선택해 입력하고, 사진을 첨부하면 Word 보고서로 내려받습니다.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setStatus(null); }}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg -mb-px border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {def ? (
            <>
              <p className="text-sm text-gray-400">{def.title}</p>
              {def.sections.map(s => (
                <fieldset key={s.title} className="border border-gray-200 rounded-xl p-4 space-y-4">
                  <legend className="px-2 text-sm font-bold text-gray-700">{s.title}</legend>
                  {s.fields.map(renderField)}
                </fieldset>
              ))}
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기본 Word 파일 <span className="text-gray-400">(.docx)</span>
              </label>
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={e => setDocxFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {docxFile && <p className="mt-1 text-xs text-gray-400 truncate">선택됨: {docxFile.name}</p>}
            </div>
          )}

          {/* Photos */}
          <fieldset className="border border-gray-200 rounded-xl p-4">
            <legend className="px-2 text-sm font-bold text-gray-700">사진 첨부</legend>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">jpg / jpeg / png / webp, 여러 장 가능</span>
              <div className="flex gap-1">
                <select
                  value={columns}
                  onChange={e => setColumns(Number(e.target.value))}
                  className="text-xs text-gray-600 border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}열</option>)}
                </select>
                <select
                  value={rows}
                  onChange={e => setRows(Number(e.target.value))}
                  className="text-xs text-gray-600 border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}행</option>)}
                </select>
              </div>
            </div>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={e => setPhotoFiles(e.target.files ? Array.from(e.target.files) : [])}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
            />
            {photoFiles.length > 0 && (
              <p className="mt-1 text-xs text-gray-400">{photoFiles.length}개 파일 선택됨</p>
            )}
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '생성 중...' : '완료 – Word 파일 다운로드'}
          </button>

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
          업로드 파일은 서버에 저장되지 않으며 요청 처리 후 즉시 폐기됩니다.
        </p>
      </div>
    </main>
  );
}
