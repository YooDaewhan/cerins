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
      const { writes, checks, rowBlocks, signs } = resolveWrites(def, values);
      // 서명은 캔버스에서 그린 PNG data URL 로 넘어온다. 지나치게 큰 값은 버린다.
      const signatures = signs
        .filter(s => s.dataUrl.length <= 4_000_000)
        .map(s => ({ cell: s.cell, data: Buffer.from(s.dataUrl.slice(s.dataUrl.indexOf(',') + 1), 'base64') }));
      baseBuffer = fillTemplate(
        template,
        writes,
        checks,
        photoFiles.length > 0 ? def.photoTable : undefined,
        rowBlocks,
        signatures
      );
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

    // 결과물은 서버에 보관한다. 관리자 페이지에서 다시 받을 수 있고,
    // 작성자는 아래 링크로 받는다. 파일을 응답에 직접 실어 보내면 blob 다운로드가 되는데,
    // 아이폰 사파리·인앱 브라우저가 그걸 무시해서 저장이 안 되는 일이 있다.
    const user = await getCurrentUser();
    const { storedName } = await savePhotoReport({
      reportType: reportType || 'upload',
      filename: outName,
      mimeType,
      buffer: payload,
      createdBy: user?.id ?? null,
    });

    return NextResponse.json({
      url: `/api/photo-report/download/${storedName}`,
      filename: outName,
    });
  } catch (err) {
    console.error('[photo-report]', err);
    const message =
      err instanceof Error ? err.message : '서버에서 오류가 발생했습니다.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
