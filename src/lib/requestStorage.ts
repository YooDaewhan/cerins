// 의뢰 첨부파일 저장/조회. 공개(public/) 가 아닌 비공개 디렉터리에 저장하고,
// 다운로드는 반드시 권한 검증을 거친 API 라우트를 통해서만 제공한다.
// 실제 서버 경로/내부 키는 클라이언트에 노출하지 않는다(파일 id 로만 접근).

import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  MAX_UPLOAD_BYTES,
  FINAL_CERTIFICATE_ALLOWED_MIMES,
  FINAL_CERTIFICATE_ALLOWED_EXT,
} from "@/src/lib/requestSettings";

// public/ 밖의 비공개 저장소. 웹서버가 정적으로 서빙하지 않는다.
export function getStorageRoot(): string {
  return process.env.PRIVATE_UPLOAD_DIR ?? path.join(process.cwd(), "private-uploads");
}

export interface StoredFileMeta {
  originalName: string;
  storedName: string;
  storagePath: string; // 저장소 루트 기준 상대 경로(DB 저장용)
  mimeType: string;
  extension: string;
  fileSize: number;
}

export interface FileValidationError {
  ok: false;
  error: string;
}
export type FileValidationResult = { ok: true } | FileValidationError;

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

// 이미지 첨부(제품사진 등)에서 허용하는 확장자 → MIME.
export const IMAGE_ALLOWED_EXT_MIMES: Record<string, string[]> = {
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
  ".bmp": ["image/bmp"],
  ".heic": ["image/heic"],
  ".heif": ["image/heif"],
};

// 파일 검증. 최종 인증서(pdfOnly)는 PDF 로, 제품사진(imageOnly)은 이미지 형식으로 제한하고,
// 그 외 일반 첨부파일은 확장자 제한 없이 모든 형식을 허용한다.
// (빈 파일 / 최대 크기 검사는 공통 적용)
export function validateUpload(
  file: File,
  opts?: { pdfOnly?: boolean; imageOnly?: boolean },
): FileValidationResult {
  if (file.size <= 0) return { ok: false, error: "빈 파일입니다." };
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    return { ok: false, error: `파일이 너무 큽니다. 최대 ${mb}MB.` };
  }

  if (opts?.pdfOnly) {
    const ext = extOf(file.name);
    const mime = (file.type || "").toLowerCase();
    if (ext !== FINAL_CERTIFICATE_ALLOWED_EXT) {
      return { ok: false, error: "PDF 파일만 업로드할 수 있습니다." };
    }
    if (!FINAL_CERTIFICATE_ALLOWED_MIMES.includes(mime)) {
      return { ok: false, error: "PDF(application/pdf) 형식만 허용됩니다." };
    }
    return { ok: true };
  }

  if (opts?.imageOnly) {
    const ext = extOf(file.name);
    const mime = (file.type || "").toLowerCase();
    const allowedMimes = IMAGE_ALLOWED_EXT_MIMES[ext];
    if (!allowedMimes) {
      return { ok: false, error: "이미지 파일만 업로드할 수 있습니다. (png/jpg/gif/webp 등)" };
    }
    // 일부 브라우저가 MIME 을 비우는 경우가 있어, 비어있으면 확장자만으로 허용한다.
    if (mime && !allowedMimes.includes(mime) && !mime.startsWith("image/")) {
      return { ok: false, error: "이미지 형식(MIME)이 올바르지 않습니다." };
    }
    return { ok: true };
  }

  // 일반 첨부파일: 모든 확장자 허용.
  return { ok: true };
}

// 파일을 비공개 저장소에 저장하고 DB 저장용 메타를 반환. 저장 이름은 UUID 로 충돌 방지.
// folderKey 는 의뢰 id 또는 (신규 생성 전) 임시 배치 키. 경로는 DB(storage_path)에만 기록되고
// 실제 의뢰 연결은 request_files.service_request_id 로 하므로 folderKey 값 자체는 자유롭다.
export async function storeRequestFile(
  folderKey: string,
  file: File,
): Promise<StoredFileMeta> {
  const ext = extOf(file.name);
  const storedName = `${crypto.randomUUID()}${ext}`;
  const relDir = path.join("requests", folderKey);
  const absDir = path.join(getStorageRoot(), relDir);
  await mkdir(absDir, { recursive: true });
  const absPath = path.join(absDir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer);

  return {
    originalName: file.name,
    storedName,
    storagePath: path.join(relDir, storedName).split(path.sep).join("/"),
    mimeType: file.type || "application/octet-stream",
    extension: ext,
    fileSize: buffer.length,
  };
}

// storage_path(상대) → 검증된 절대 경로. 경로 조작(../) 방지.
export function resolveStoredPath(storagePath: string): string | null {
  const root = path.resolve(getStorageRoot());
  const abs = path.resolve(root, storagePath);
  // 반드시 저장소 루트 하위여야 한다.
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

export async function readStoredFile(
  storagePath: string,
): Promise<Buffer | null> {
  const abs = resolveStoredPath(storagePath);
  if (!abs) return null;
  try {
    const s = await stat(abs);
    if (!s.isFile()) return null;
    return await readFile(abs);
  } catch {
    return null;
  }
}
