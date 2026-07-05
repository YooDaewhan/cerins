import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth";
import {
  SUPPORTED_POST_LOCALES,
  deletePostGroup,
  getAdminPostGroup,
  upsertPostGroup,
  type PostTranslationInput,
} from "@/src/lib/posts";
import type { LocaleCode } from "@/src/lib/types";

const BOARD_CODE = "faq";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

interface PatchBody {
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(published_at))
    return {
      ok: false,
      error: `${locale}: 발행일은 YYYY-MM-DD 형식이어야 합니다.`,
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
      published_at,
    },
  };
}

export async function GET(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { slug } = await ctx.params;
  const group = await getAdminPostGroup(BOARD_CODE, slug);
  if (!group) {
    return NextResponse.json(
      { error: "글을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  return NextResponse.json({ post: group, locales: SUPPORTED_POST_LOCALES });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { slug } = await ctx.params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 },
    );
  }

  const existing = await getAdminPostGroup(BOARD_CODE, slug);
  if (!existing) {
    return NextResponse.json(
      { error: "글을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const translations = body.translations ?? {};
  const inputs: Partial<Record<LocaleCode, PostTranslationInput | null>> = {};

  for (const [locale, raw] of Object.entries(translations) as [
    LocaleCode,
    Partial<PostTranslationInput> | null | undefined,
  ][]) {
    if (raw === null || raw === undefined) {
      inputs[locale] = null;
      continue;
    }
    const v = validateTranslation(locale, raw);
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }
    inputs[locale] = v.value;
  }

  // Prevent deleting all translations — that should go through DELETE.
  const remaining = new Set(
    Object.keys(existing.translations) as LocaleCode[],
  );
  for (const [locale, val] of Object.entries(inputs) as [
    LocaleCode,
    PostTranslationInput | null,
  ][]) {
    if (val === null) remaining.delete(locale);
    else remaining.add(locale);
  }
  if (remaining.size === 0) {
    return NextResponse.json(
      { error: "최소 한 개 언어의 번역은 남아 있어야 합니다." },
      { status: 400 },
    );
  }

  try {
    const result = await upsertPostGroup(BOARD_CODE, slug, inputs);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("admin faqs patch error", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { slug } = await ctx.params;
  try {
    const affected = await deletePostGroup(BOARD_CODE, slug);
    if (affected === 0) {
      return NextResponse.json(
        { error: "삭제할 글이 없습니다." },
        { status: 404 },
      );
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, deleted: affected });
  } catch (err) {
    console.error("admin faqs delete error", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
