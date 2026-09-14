"use client";

import { useState } from "react";

// ponytail: map.baidu.com 은 임베드용 엔드포인트가 아니라 풀 웹앱이라, 로드되는 순간
// 자기 프레임에 포커스를 가져간다 → 부모 페이지 스크롤이 그 지점(상하이)으로 튄다.
// 클릭 전에는 iframe 자체를 만들지 않아서 원천 차단. 클릭 후엔 이미 사용자가 그 위치를 보고 있어 문제 없음.
export default function DeferredMapFrame({
  src,
  title,
  label,
}: {
  src: string;
  title: string;
  label: string;
}) {
  const [show, setShow] = useState(false);

  if (show) {
    return (
      <iframe
        src={src}
        title={title}
        className="w-full h-80 border-0"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShow(true)}
      className="w-full h-80 bg-gray-100 hover:bg-gray-50 text-gray-500 hover:text-(--brand) transition flex flex-col items-center justify-center gap-2 text-sm"
    >
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
      {label}
    </button>
  );
}
