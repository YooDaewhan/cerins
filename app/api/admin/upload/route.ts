import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { requireAdmin } from "@/src/lib/auth";

export const runtime = "nodejs";

const IMAGE_MIMES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

const VIDEO_MIMES: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
};

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "잘못된 업로드 요청입니다." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
  }

  const mime = file.type || "";
  const isImage = mime in IMAGE_MIMES;
  const isVideo = mime in VIDEO_MIMES;
  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "이미지 또는 mp4/webm/ogv 비디오만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size <= 0) {
    return NextResponse.json({ error: "빈 파일입니다." }, { status: 400 });
  }
  if (file.size > limit) {
    const mb = (limit / (1024 * 1024)).toFixed(0);
    return NextResponse.json(
      { error: `파일이 너무 큽니다. 최대 ${mb}MB.` },
      { status: 413 },
    );
  }

  const ext = isImage ? IMAGE_MIMES[mime] : VIDEO_MIMES[mime];
  const stamp = Date.now().toString(36);
  const rand = crypto.randomBytes(6).toString("hex");
  const safeName = `${stamp}-${rand}${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, safeName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const url = `/uploads/${safeName}`;
  return NextResponse.json({
    ok: true,
    url,
    kind: isVideo ? "video" : "image",
    mime,
    size: file.size,
  });
}
