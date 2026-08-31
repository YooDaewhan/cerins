import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildReport, bundleWithVideos } from '@/src/lib/docxPhotoReport';
import { fillTemplate } from '@/src/lib/docxFillTemplate';
import { getReport, resolveWrites, type FormValues } from '@/src/lib/reportForms';
import { savePhotoReport, buildReportFilename } from '@/src/lib/photoReports';
import { getCurrentUser } from '@/src/lib/auth';

export const runtime = 'nodejs';

const TEMPLATE_DIR = path.join(process.cwd(), 'src', 'lib', 'reportTemplates');


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const reportType = (formData.get('reportType') as string | null) ?? '';
    const photoFiles = formData.getAll('photos') as File[];
    const videoFiles = (formData.getAll('videos') as File[]).filter(f => f.size > 0);

    const reporterName = ((formData.get('reporterName') as string | null) ?? '').trim();
    if (!reporterName) {
      return NextResponse.json({ message: '이름을 입력해주세요.' }, { status: 400 });
    }

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
      const { writes, checks, rowBlocks } = resolveWrites(def, values);
      baseBuffer = fillTemplate(template, writes, checks, photoFiles.length > 0 ? def.photoTable : undefined, rowBlocks);
      filename = buildReportFilename(def.title, reporterName, 'docx');
    } else {
      const docxFile = formData.get('docx') as File | null;
      if (!docxFile || docxFile.size === 0) {
        return NextResponse.json({ message: 'Word 파일(.docx)이 필요합니다.' }, { status: 400 });
      }
      baseBuffer = Buffer.from(await docxFile.arrayBuffer());
      filename = buildReportFilename('Inspection Report', reporterName, 'docx');
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

    // 동영상은 Word 에 넣을 수 없으므로 완성된 문서와 함께 zip 으로 묶어 보낸다.
    let payload = resultBuffer;
    let outName = filename;
    let mimeType =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (videoFiles.length > 0) {
      const videos = await Promise.all(
        videoFiles.map(async file => ({
          name: file.name,
          buffer: Buffer.from(await file.arrayBuffer()),
        }))
      );
      payload = bundleWithVideos(resultBuffer, filename, videos);
      outName = filename.replace(/[.]docx$/, '') + '.zip';
      mimeType = 'application/zip';
    }

    // 결과물은 서버에도 보관해 관리자 페이지에서 다시 받을 수 있게 한다.
    const user = await getCurrentUser();
    await savePhotoReport({
      reportType: reportType || 'upload',
      filename: outName,
      mimeType,
      buffer: payload,
      createdBy: user?.id ?? null,
    });

    return new NextResponse(new Uint8Array(payload), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        // 한글 이름이 들어가므로 RFC 5987 로 인코딩한다.
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(outName)}`,
        'Content-Length': String(payload.length),
      },
    });
  } catch (err) {
    console.error('[photo-report]', err);
    const message =
      err instanceof Error ? err.message : '서버에서 오류가 발생했습니다.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
