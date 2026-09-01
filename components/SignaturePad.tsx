'use client';

import { useEffect, useRef, useState } from 'react';

// 캔버스 실물 크기(px). 화면 크기와 무관하게 결과 PNG 해상도를 고정한다.
// 3:1 은 원본 Word 양식의 서명 칸 비율에 맞춘 것.
const W = 1200;
const H = 400;

type Point = { x: number; y: number };

/**
 * 서명 입력. 폼에는 미리보기만 두고, 실제 서명은 전체화면 팝업에서 받는다.
 * 폰에서 좁은 칸에 손가락으로 그리는 걸 피하고, 확인을 누르기 전엔 값이 바뀌지 않아
 * 잘못 그려도 취소하면 원래 서명이 그대로 남는다.
 */
export default function SignaturePad({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  t: (s: string) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {value ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL 이라 최적화 대상이 아니다 */}
          <img
            src={value}
            alt={t('Signature')}
            className="h-16 flex-1 min-w-0 rounded-lg border border-gray-200 bg-white object-contain"
          />
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              {t('Re-sign')}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50"
            >
              {t('Clear signature')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 bg-white py-6 text-sm font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          {t('Tap to sign')}
        </button>
      )}

      {open && (
        <SignatureModal
          t={t}
          onCancel={() => setOpen(false)}
          onDone={dataUrl => {
            onChange(dataUrl);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/** 전체화면 서명 팝업. 획 단위로 기록해 한 획씩 되돌릴 수 있다. */
function SignatureModal({
  onCancel,
  onDone,
  t,
}: {
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
  t: (s: string) => string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const drawing = useRef(false);
  // 되돌리기·확인 버튼 상태를 갱신하려고 획 수를 상태로도 들고 있는다.
  const [count, setCount] = useState(0);

  // 팝업이 떠 있는 동안 뒤 페이지가 스크롤되지 않게 한다. Esc 로 닫는다.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);

  function ctx() {
    const c = ref.current?.getContext('2d');
    if (c) {
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = '#111827';
    }
    return c;
  }

  /** 기록해 둔 획을 처음부터 다시 그린다(되돌리기·전체 지우기용). */
  function redraw() {
    const c = ctx();
    if (!c) return;
    c.clearRect(0, 0, W, H);
    for (const s of strokes.current) {
      c.beginPath();
      c.moveTo(s[0].x, s[0].y);
      // 점 하나만 찍힌 획도 보이도록 아주 짧은 선을 긋는다.
      if (s.length === 1) c.lineTo(s[0].x + 0.1, s[0].y);
      else for (const p of s.slice(1)) c.lineTo(p.x, p.y);
      c.stroke();
    }
  }

  /** 화면 좌표 → 캔버스 좌표. CSS 크기가 달라도 맞도록 비율로 환산한다. */
  function pos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    // 캔버스 밖으로 손가락이 나가도 계속 그려지게 잡아둔다.
    // 브라우저에 따라 예외가 나는데, 잡지 못해도 그리기는 되어야 한다.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    drawing.current = true;
    const p = pos(e);
    strokes.current.push([p]);
    const c = ctx();
    c?.beginPath();
    c?.moveTo(p.x, p.y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const p = pos(e);
    strokes.current[strokes.current.length - 1].push(p);
    const c = ctx();
    c?.lineTo(p.x, p.y);
    c?.stroke();
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    setCount(strokes.current.length);
  }

  function undo() {
    strokes.current.pop();
    redraw();
    setCount(strokes.current.length);
  }

  function clear() {
    strokes.current = [];
    redraw();
    setCount(0);
  }

  const btn = 'flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-center gap-3 bg-black/60 p-4">
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl">
        <p className="mb-2 text-center text-sm font-medium text-gray-600">
          {t('Sign here with your mouse or finger.')}
        </p>
        {/* touch-action:none 이라야 손가락으로 그을 때 화면이 스크롤되지 않는다. */}
        <canvas
          ref={ref}
          width={W}
          height={H}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          onPointerCancel={up}
          className="aspect-[3/1] w-full touch-none rounded-xl border border-dashed border-gray-300 bg-white"
        />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={undo} disabled={count === 0} className={`${btn} border border-gray-300 text-gray-600`}>
            {t('Undo')}
          </button>
          <button type="button" onClick={clear} disabled={count === 0} className={`${btn} border border-gray-300 text-gray-600`}>
            {t('Erase all')}
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onCancel} className={`${btn} border border-gray-300 text-gray-600`}>
            {t('Cancel')}
          </button>
          <button
            type="button"
            disabled={count === 0}
            onClick={() => {
              const c = ref.current;
              if (c) onDone(c.toDataURL('image/png'));
            }}
            className={`${btn} bg-blue-600 text-white`}
          >
            {t('Use this signature')}
          </button>
        </div>
      </div>
    </div>
  );
}
