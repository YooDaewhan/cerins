import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildReport } from '@/src/lib/docxPhotoReport';
import { fillTemplate } from '@/src/lib/docxFillTemplate';
import { getReport, resolveWrites, type FormValues } from '@/src/lib/reportForms';

export const runtime = 'nodejs';

const TEMPLATE_DIR = path.join(process.cwd(), 'src', 'lib', 'reportTemplates');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const reportType = (formData.get('reportType') as string | null) ?? '';
    const photoFiles = formData.getAll('photos') as File[];

    let baseBuffer: Buffer;
    let filename: string;

    if (reportType && reportType !== 'upload') {
      const def = getReport(reportType);
      if (!def) {
        return NextResponse.json({ message: '알 수 없는 보고서 종류입니다.' }, { status: 400 });
      }

      let values: FormValues;
      try {
        values = JSON.parse((formData.get('values') as string) ?? '{}');
      } catch {
        return NextResponse.json({ message: '입력값 형식이 올바르지 않습니다.' }, { status: 400 });
      }

      const template = await readFile(path.join(TEMPLATE_DIR, `${def.id}.docx`));
      const { writes, checks } = resolveWrites(def, values);
      baseBuffer = fillTemplate(template, writes, checks, photoFiles.length > 0 ? def.photoTable : undefined);
      filename = `${def.id}_report.docx`;
    } else {
      const docxFile = formData.get('docx') as File | null;
      if (!docxFile || docxFile.size === 0) {
        return NextResponse.json({ message: 'Word 파일(.docx)이 필요합니다.' }, { status: 400 });
      }
      baseBuffer = Buffer.from(await docxFile.arrayBuffer());
      filename = 'report.docx';
    }

    let resultBuffer = baseBuffer;
    if (photoFiles.length > 0) {
      const photos = await Promise.all(
        photoFiles.map(async file => ({
          name: file.name,
          buffer: Buffer.from(await file.arrayBuffer()),
        }))
      );
      let labels: string[] = [];
      try {
        labels = JSON.parse((formData.get('labels') as string) ?? '[]');
      } catch { labels = []; }
      resultBuffer = await buildReport(
        baseBuffer,
        photos.map((p, i) => ({ ...p, name: labels[i] ?? p.name })),
      );
    } else if (!reportType || reportType === 'upload') {
      return NextResponse.json({ message: '사진이 최소 1장 필요합니다.' }, { status: 400 });
    }

    return new NextResponse(new Uint8Array(resultBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(resultBuffer.length),
      },
    });
  } catch (err) {
    console.error('[photo-report]', err);
    const message =
      err instanceof Error ? err.message : '서버에서 오류가 발생했습니다.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
