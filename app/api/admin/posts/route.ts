import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth";
import {
  SUPPORTED_POST_LOCALES,
  listAdminPostGroups,
  nextNumericSlug,
  upsertPostGroup,
  type PostTranslationInput,
} from "@/src/lib/posts";
import type { LocaleCode } from "@/src/lib/types";

const BOARD_CODE = "news";
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface CreateBody {
  slug?: string;
  translations?: Partial<
    Record<LocaleCode, Partial<PostTranslationInput> | null>
  >;
}

function validateTranslation(
  locale: LocaleCode,
  t: Partial<PostTranslationInput>,
): { ok: true; value: PostTranslationInput } | { ok: false; error: string } {
  const title = (t.title ?? "").trim();
  const summary = (t.summary ?? "").trim();
  const content = t.content ?? "";
  const published_at = (t.published_at ?? "").trim();

  if (!title) return { ok: false, error: `${locale}: 제목을 입력하세요.` };
  if (title.length > 255)
    return { ok: false, error: `${locale}: 제목은 255자 이내여야 합니다.` };
  if (!summary)
    return { ok: false, error: `${locale}: 요약을 입력하세요.` };
  if (!DATE_RE.test(published_at))
    return {
      ok: false,
      error: `${locale}: 발행일은 YYYY-MM-DD 형식이어야 합니다.`,
    };

  const popup_start = (t.popup_start ?? "").trim() || null;
  const popup_end = (t.popup_end ?? "").trim() || null;
  if (
    (popup_start && !DATE_RE.test(popup_start)) ||
    (popup_end && !DATE_RE.test(popup_end))
  )
    return {
      ok: false,
      error: `${locale}: 팝업 노출기간은 YYYY-MM-DD 형식이어야 합니다.`,
    };
  if (popup_start && popup_end && popup_start > popup_end)
    return {
      ok: false,
      error: `${locale}: 팝업 노출 종료일이 시작일보다 빠릅니다.`,
    };

  return {
    ok: true,
    value: {
      title,
      summary,
      content,
      thumbnail: t.thumbnail ?? null,
      author: t.author ?? null,
      is_published: t.is_published !== false,
      is_popup: t.is_popup === true,
      popup_type: t.popup_type ?? 1,
      popup_start,
      popup_end,
      published_at,
    },
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const groups = await listAdminPostGroups(BOARD_CODE);
  return NextResponse.json({
    posts: groups,
    locales: SUPPORTED_POST_LOCALES,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 },
    );
  }

  const translations = body.translations ?? {};
  const inputs: Partial<Record<LocaleCode, PostTranslationInput>> = {};

  let hasAny = false;
  for (const [locale, raw] of Object.entries(translations) as [
    LocaleCode,
    Partial<PostTranslationInput> | null | undefined,
  ][]) {
    if (!raw) continue;
    const v = validateTranslation(locale, raw);
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }
    inputs[locale] = v.value;
    hasAny = true;
  }

  if (!hasAny) {
    return NextResponse.json(
      { error: "최소 한 개 언어의 번역을 입력해야 합니다." },
      { status: 400 },
    );
  }

  // 한국어(또는 최초로 입력된 언어) 내용을 다른 모든 언어의 기본값으로 복제한다.
  // 그래야 각 언어 관리자가 빈 화면이 아니라 원문을 보고 번역·수정할 수 있다.
  // 복제된 언어판은 미발행(draft)으로 넣어, 번역 전 한국어 원문이 공개 첫 화면에
  // 노출되지 않게 한다. 번역가가 내용을 고치고 '공개'를 체크하면 그 언어로 노출된다.
  const sourceLocale: LocaleCode = inputs.ko
    ? "ko"
    : (Object.keys(inputs)[0] as LocaleCode);
  const base = inputs[sourceLocale]!;
  for (const locale of SUPPORTED_POST_LOCALES) {
    if (inputs[locale]) continue;
    inputs[locale] = { ...base, is_published: false, is_popup: false };
  }

  let slug: string;
  if (body.slug && body.slug.trim()) {
    slug = body.slug.trim().toLowerCase();
    if (!SLUG_RE.test(slug) || slug.length > 128) {
      return NextResponse.json(
        { error: "slug은 소문자/숫자/-만 가능합니다." },
        { status: 400 },
      );
    }
  } else {
    slug = await nextNumericSlug(BOARD_CODE);
  }

  try {
    const result = await upsertPostGroup(BOARD_CODE, slug, inputs);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Duplicate") || msg.includes("uq_post")) {
      return NextResponse.json(
        { error: "이미 사용 중인 slug 입니다." },
        { status: 409 },
      );
    }
    console.error("admin posts create error", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
