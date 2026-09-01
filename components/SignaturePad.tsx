'use client';

import { useEffect, useRef, useState } from 'react';

// 캔버스 실물 크기(px). CSS 너비와 무관하게 결과 PNG 해상도를 고정한다.
const W = 900;
const H = 300;

/** 마우스·터치로 서명을 받아 PNG data URL 로 돌려준다. 비었으면 빈 문자열. */
export default function SignaturePad({
  value,
  onChange,
  clearLabel,
  hint,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  clearLabel: string;
  hint: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(!value);

  // 탭을 옮겼다 돌아오면 캔버스는 비어도 값은 남아 있다. 저장된 서명을 되그린다.
  useEffect(() => {
    if (!value) return;
    const img = new Image();
    img.onload = () => ref.current?.getContext('2d')?.drawImage(img, 0, 0, W, H);
    img.src = value;
    // 마운트 때 한 번만. 그리는 도중 바뀌는 value 는 이미 캔버스에 있다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 화면 좌표 → 캔버스 좌표. CSS 크기가 달라도 맞도록 비율로 환산한다. */
  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function ctx() {
    const c = ref.current?.getContext('2d');
    if (c) {
      c.lineWidth = 4;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = '#111827';
    }
    return c;
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const c = ctx();
    const p = pos(e);
    c?.beginPath();
    c?.moveTo(p.x, p.y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const p = pos(e);
    const c = ctx();
    c?.lineTo(p.x, p.y);
    c?.stroke();
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = ref.current;
    if (!canvas) return;
    setEmpty(false);
    onChange(canvas.toDataURL('image/png'));
  }

  function clear() {
    ref.current?.getContext('2d')?.clearRect(0, 0, W, H);
    setEmpty(true);
    onChange('');
  }

  return (
    <div>
      {/* touch-action:none 이라야 모바일에서 손가락으로 그을 때 화면이 스크롤되지 않는다. */}
      <canvas
        ref={ref}
        width={W}
        height={H}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        onPointerCancel={up}
        className="w-full h-32 rounded-lg border border-dashed border-gray-300 bg-white touch-none cursor-crosshair"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-gray-400">{empty ? hint : ''}</span>
        <button type="button" onClick={clear} className="text-xs text-red-500 hover:underline">
          {clearLabel}
        </button>
      </div>
    </div>
  );
}
