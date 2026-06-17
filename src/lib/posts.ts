import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { sanitizePostHtml } from "@/src/lib/sanitizeHtml";
import type { LocaleCode } from "@/src/lib/types";

export const SUPPORTED_POST_LOCALES: LocaleCode[] = [
  "ko",
  "en",
  "ja",
  "zh",
  "ru",
];

export interface AdminPostTranslation {
  id: number;
  locale: LocaleCode;
  title: string;
  summary: string;
  content: string;
  thumbnail: string | null;
  author: string | null;
  is_published: boolean;
  published_at: string;
}

export interface AdminPostGroup {
  slug: string;
  translations: Partial<Record<LocaleCode, AdminPostTranslation>>;
}

interface PostRow extends RowDataPacket {
  id: number;
  board_code: string;
  locale: LocaleCode;
  slug: string;
  title: string;
  summary: string;
  content: string;
  thumbnail: string | null;
  author: string | null;
  is_published: number;
  published_at: string;
}

function rowToTranslation(row: PostRow): AdminPostTranslation {
  return {
    id: row.id,
    locale: row.locale,
    title: row.title,
    summary: row.summary,
    content: row.content,
    thumbnail: row.thumbnail,
    author: row.author,
    is_published: row.is_published === 1,
    published_at: row.published_at,
  };
}

export async function listAdminPostGroups(
  boardCode: string,
): Promise<AdminPostGroup[]> {
  const [rows] = await getPool().query<PostRow[]>(
    "SELECT * FROM posts WHERE board_code = ? ORDER BY published_at DESC, id DESC",
    [boardCode],
  );

  const map = new Map<string, AdminPostGroup>();
  for (const row of rows) {
    let group = map.get(row.slug);
    if (!group) {
      group = { slug: row.slug, translations: {} };
      map.set(row.slug, group);
    }
    group.translations[row.locale] = rowToTranslation(row);
  }
  return Array.from(map.values());
}

export async function getAdminPostGroup(
  boardCode: string,
  slug: string,
): Promise<AdminPostGroup | null> {
  const [rows] = await getPool().query<PostRow[]>(
    "SELECT * FROM posts WHERE board_code = ? AND slug = ?",
    [boardCode, slug],
  );
  if (rows.length === 0) return null;
  const group: AdminPostGroup = { slug, translations: {} };
  for (const row of rows) {
    group.translations[row.locale] = rowToTranslation(row);
  }
  return group;
}

export interface PostTranslationInput {
  title: string;
  summary: string;
  content: string;
  thumbnail?: string | null;
  author?: string | null;
  is_published: boolean;
  published_at: string;
}

export interface UpsertResult {
  slug: string;
  inserted: LocaleCode[];
  updated: LocaleCode[];
  deleted: LocaleCode[];
}

export async function nextNumericSlug(boardCode: string): Promise<string> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT COALESCE(MAX(CAST(slug AS UNSIGNED)), 0) + 1 AS next FROM posts WHERE board_code = ? AND slug REGEXP '^[0-9]+$'",
    [boardCode],
  );
  const next = (rows[0] as { next: number | string }).next;
  return String(next);
}

export async function upsertPostGroup(
  boardCode: string,
  slug: string,
  translations: Partial<Record<LocaleCode, PostTranslationInput | null>>,
): Promise<UpsertResult> {
  const pool = getPool();
  const conn = await pool.getConnection();
  const inserted: LocaleCode[] = [];
  const updated: LocaleCode[] = [];
  const deleted: LocaleCode[] = [];
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query<PostRow[]>(
      "SELECT * FROM posts WHERE board_code = ? AND slug = ?",
      [boardCode, slug],
    );
    const existingByLocale = new Map<LocaleCode, PostRow>();
    for (const row of existingRows) existingByLocale.set(row.locale, row);

    for (const locale of SUPPORTED_POST_LOCALES) {
      const input = translations[locale];
      const existing = existingByLocale.get(locale);

      if (input === null || input === undefined) {
        if (existing) {
          await conn.execute("DELETE FROM posts WHERE id = ?", [existing.id]);
          deleted.push(locale);
        }
        continue;
      }

      const sanitized = sanitizePostHtml(input.content);
      const publishedFlag = input.is_published ? 1 : 0;
      const thumbnail =
        input.thumbnail && input.thumbnail.trim() ? input.thumbnail.trim() : null;
      const author =
        input.author && input.author.trim() ? input.author.trim() : null;

      if (existing) {
        await conn.execute(
          `UPDATE posts
             SET title = ?, summary = ?, content = ?, thumbnail = ?, author = ?,
                 is_published = ?, published_at = ?
           WHERE id = ?`,
          [
            input.title,
            input.summary,
            sanitized,
            thumbnail,
            author,
            publishedFlag,
            input.published_at,
            existing.id,
          ],
        );
        updated.push(locale);
      } else {
        const [maxRow] = await conn.query<RowDataPacket[]>(
          "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM posts",
        );
        const nextId = Number((maxRow[0] as { next_id: number }).next_id);
        await conn.execute(
          `INSERT INTO posts
             (id, board_code, locale, slug, title, summary, content, thumbnail, author, is_published, published_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nextId,
            boardCode,
            locale,
            slug,
            input.title,
            input.summary,
            sanitized,
            thumbnail,
            author,
            publishedFlag,
            input.published_at,
          ],
        );
        inserted.push(locale);
      }
    }

    await conn.commit();
    return { slug, inserted, updated, deleted };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deletePostGroup(
  boardCode: string,
  slug: string,
): Promise<number> {
  const [result] = await getPool().execute(
    "DELETE FROM posts WHERE board_code = ? AND slug = ?",
    [boardCode, slug],
  );
  const meta = result as { affectedRows?: number };
  return meta.affectedRows ?? 0;
}
