"use client";

import { useRef, useState } from "react";
import { isVideoUrl } from "@/src/lib/media";

interface MediaInputProps {
  url: string;
  onChange: (url: string) => void;
  /** input[type=file] accept. 예: "image/*" 또는 "image/*,video/mp4,video/webm,video/ogg" */
  accept: string;
  /** 미리보기 배경색(투명 이미지/로딩 중 영상용) */
  fallback?: string;
  /** 미리보기 크기. 기본 h-32 */
  previewClassName?: string;
  /** 미리보기 object-fit. 기본 cover */
  fit?: "cover" | "contain";
  placeholder?: string;
  helpText?: string;
}

export default function MediaInput({
  url,
  onChange,
  accept,
  fallback,
  previewClassName = "h-32 w-auto",
  fit = "cover",
  placeholder = "https://… 또는 파일 업로드",
  helpText = "이미지(png/jpg/gif/webp/svg) 또는 영상(mp4/webm/ogv) 업로드 가능. 외부 URL도 그대로 사용할 수 있습니다.",
}: MediaInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) {
        setErr(json.error ?? "업로드에 실패했습니다.");
        return;
      }
      onChange(json.url);
    } catch {
      setErr("네트워크 오류로 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  const isVideo = isVideoUrl(url);
  const objectFit = fit === "contain" ? "object-contain" : "object-cover";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void handleFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-60"
        >
          {uploading ? "업로드 중..." : "파일 선택"}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded border border-gray-300 px-2 py-1.5 text-xs hover:bg-gray-50"
          >
            지우기
          </button>
        )}
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {url &&
        (isVideo ? (
          <video
            src={url}
            className={`${previewClassName} rounded border border-gray-200 ${objectFit}`}
            style={{ backgroundColor: fallback }}
            controls
            muted
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className={`${previewClassName} rounded border border-gray-200 ${objectFit}`}
            style={{ backgroundColor: fallback }}
          />
        ))}
      {helpText && <p className="text-[11px] text-gray-400">{helpText}</p>}
    </div>
  );
}
