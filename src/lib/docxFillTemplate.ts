import PizZip from 'pizzip';

/**
 * .docx 템플릿의 특정 표 셀에 값을 채우고, 체크박스(☐)를 체크(☒)한다.
 *
 * 셀 지정 형식: `T{표번호}.R{행}.C{열}` (0-based, 문서 등장 순서)
 *   - `T0.R1.C2@1` 처럼 `@n` 을 붙이면 셀 안의 n번째 문단을 대상으로 한다(기본 0).
 * 체크박스 지정: 문서 전체에서 '☐' 가 등장하는 순서(0-based) 인덱스.
 */

export interface CellWrite {
  /** 예: 'T0.R1.C2' 또는 'T0.R1.C2@1' */
  cell: string;
  value: string;
  /** true 면 해당 문단의 기존 텍스트를 지우고 덮어쓴다. 기본은 뒤에 이어붙이기. */
  replace?: boolean;
  /** 값 앞에 붙일 고정 문자열 (예: 'Job File No. ') */
  prefix?: string;
}

/** 셀에 넣을 그림(서명). PNG 만 받는다. */
export interface CellImage {
  /** 예: 'T3.R4.C1' */
  cell: string;
  data: Buffer;
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

/** 셀 그림의 가로 크기(EMU). 원본 양식에 들어 있던 서명 그림과 같은 2.99cm. */
const IMAGE_WIDTH_EMU = 1079500;

/** PNG 헤더(IHDR)에서 픽셀 크기를 읽는다. PNG 가 아니면 null. */
function pngSize(b: Buffer): { w: number; h: number } | null {
  if (b.length < 24 || b.readUInt32BE(12) !== 0x49484452) return null; // 'IHDR'
  const w = b.readUInt32BE(16);
  const h = b.readUInt32BE(20);
  return w > 0 && h > 0 ? { w, h } : null;
}

/** 인라인 그림 run. 네임스페이스를 태그마다 직접 달아 템플릿 선언에 기대지 않는다. */
function buildImageRun(rId: string, cx: number, cy: number, id: number): string {
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="Signature${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="Signature${id}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

/** 입력한 행 수에 맞춰 크기를 바꿀 표 행 구간. count 가 목표 행 수. */
export interface RowBlock {
  table: number;
  from: number;
  to: number;
  count: number;
}

const CELL_RANGE_RE = /<w:tbl(?=[ >])|<\/w:tbl>|<w:tr(?=[ >])|<\/w:tr>|<w:tc(?=[ >])|<\/w:tc>/g;
const ROW_RANGE_RE = /<w:tbl(?=[ >])|<\/w:tbl>|<w:tr(?=[ >])|<\/w:tr>/g;

/** 문서 XML을 훑어 `T#.R#` → 행(<w:tr>) 전체 범위를 만든다. */
function indexRows(xml: string): Map<string, { start: number; end: number }> {
  const map = new Map<string, { start: number; end: number }>();
  const tblStack: { id: number; row: number }[] = [];
  const open: { key: string; start: number }[] = [];
  let tblCount = 0;

  ROW_RANGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ROW_RANGE_RE.exec(xml)) !== null) {
    const tag = m[0];
    if (tag === '<w:tbl') tblStack.push({ id: tblCount++, row: -1 });
    else if (tag === '</w:tbl>') tblStack.pop();
    else if (tag === '<w:tr') {
      const tb = tblStack[tblStack.length - 1];
      if (!tb) continue;
      tb.row++;
      open.push({ key: `T${tb.id}.R${tb.row}`, start: m.index });
    } else {
      const o = open.pop();
      if (o) map.set(o.key, { start: o.start, end: m.index + '</w:tr>'.length });
    }
  }
  return map;
}

/** 행 하나를 복제용으로 비운다. 첫 칸에는 일련번호를 넣는다. */
function blankRow(tr: string, no: number): string {
  let first = true;
  return tr.replace(/(<w:t(?: [^>]*)?>)[^<]*(<\/w:t>)/g, (_m, o: string, c: string) => {
    const v = first ? String(no) : '';
    first = false;
    return `${o}${v}${c}`;
  });
}

/** 표의 행 구간을 목표 개수에 맞춰 지우거나 마지막 행을 복제해 늘린다.
 *  셀 좌표를 다시 계산해야 하므로 값 채우기 전에 먼저 돌린다. */
function resizeRowBlocks(xml: string, blocks: RowBlock[]): string {
  const rows = indexRows(xml);
  const ops = blocks
    .map(b => ({ b, last: rows.get(`T${b.table}.R${b.to}`) }))
    .filter((x): x is { b: RowBlock; last: { start: number; end: number } } => !!x.last)
    // 뒤쪽부터 손봐야 앞쪽 오프셋이 틀어지지 않는다.
    .sort((a, z) => z.last.start - a.last.start);

  let out = xml;
  for (const { b, last } of ops) {
    const size = b.to - b.from + 1;
    const n = Math.max(1, b.count);
    if (n === size) continue;
    if (n < size) {
      const cut = rows.get(`T${b.table}.R${b.from + n}`);
      if (!cut) continue;
      out = out.slice(0, cut.start) + out.slice(last.end);
    } else {
      const tpl = out.slice(last.start, last.end);
      const extra = Array.from({ length: n - size }, (_x, i) => blankRow(tpl, size + i + 1)).join('');
      out = out.slice(0, last.end) + extra + out.slice(last.end);
    }
  }
  return out;
}

/** 문서 XML을 훑어 `T#.R#.C#` → 셀 내부 XML 범위를 만든다. */
function indexCells(xml: string): Map<string, { start: number; end: number }> {
  const map = new Map<string, { start: number; end: number }>();
  const tblStack: { id: number; row: number; cell: number }[] = [];
  const openCells: { key: string; start: number }[] = [];
  let tblCount = 0;

  CELL_RANGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CELL_RANGE_RE.exec(xml)) !== null) {
    const tag = m[0];
    if (tag === '<w:tbl') {
      tblStack.push({ id: tblCount++, row: -1, cell: -1 });
    } else if (tag === '</w:tbl>') {
      tblStack.pop();
    } else if (tag === '</w:tr>' || tag === '</w:tc>') {
      if (tag === '</w:tc>') {
        const open = openCells.pop();
        if (open) map.set(open.key, { start: open.start, end: m.index });
      }
    } else {
      const tb = tblStack[tblStack.length - 1];
      if (!tb) continue;
      if (tag.startsWith('<w:tr')) {
        tb.row++;
        tb.cell = -1;
      } else {
        tb.cell++;
        // 여는 태그의 끝('>')을 찾아 내부 시작 위치로 삼는다.
        const gt = xml.indexOf('>', m.index);
        openCells.push({ key: `T${tb.id}.R${tb.row}.C${tb.cell}`, start: gt + 1 });
      }
    }
  }
  return map;
}

/** 셀 내부 XML에서 n번째 <w:p> 문단의 범위를 찾는다. */
function findParagraph(inner: string, n: number): { start: number; end: number } | null {
  const re = /<w:p(?=[ >])/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(inner)) !== null) {
    // 자기 닫힘 문단 <w:p/> 은 대상에서 제외
    const gt = inner.indexOf('>', m.index);
    if (inner[gt - 1] === '/') continue;
    if (i === n) {
      const close = inner.indexOf('</w:p>', gt);
      if (close === -1) return null;
      return { start: gt + 1, end: close };
    }
    i++;
  }
  return null;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 여러 줄 텍스트를 <w:br/> 로 이어진 하나의 run 으로 만든다. */
function buildRun(text: string, rPr: string): string {
  const parts = text.split('\n').map(line => `<w:t xml:space="preserve">${escapeXml(line)}</w:t>`);
  return `<w:r>${rPr}${parts.join('<w:br/>')}</w:r>`;
}

function firstRPr(s: string): string {
  const m = s.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  return m ? m[0] : '';
}

export function fillTemplate(
  templateBuffer: Buffer,
  writes: CellWrite[],
  checkIndexes: number[],
  /** 삭제할 빈 사진 표 (예: 'T12') — 사진은 별도로 뒤에 붙이므로 템플릿의 빈 표는 제거한다. */
  dropTable?: string,
  rowBlocks: RowBlock[] = [],
  /** 서명 등 셀에 박아 넣을 그림. 해당 셀 첫 문단 끝에 붙는다. */
  images: CellImage[] = []
): Buffer {
  const zip = new PizZip(templateBuffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('템플릿이 올바른 .docx 파일이 아닙니다.');

  const xml = resizeRowBlocks(docFile.asText(), rowBlocks);
  const cells = indexCells(xml);
  const edits: Edit[] = [];

  if (images.length > 0) {
    const relsFile = zip.file('word/_rels/document.xml.rels');
    const ctFile = zip.file('[Content_Types].xml');
    if (!relsFile || !ctFile) throw new Error('템플릿이 올바른 .docx 파일이 아닙니다.');

    let relsXml = relsFile.asText();
    const usedIds = [...relsXml.matchAll(/\bId="rId(\d+)"/g)].map(m => parseInt(m[1], 10));
    let nextRId = (usedIds.length > 0 ? Math.max(...usedIds) : 0) + 1;

    images.forEach((img, i) => {
      const size = pngSize(img.data);
      if (!size) return;
      const range = cells.get(img.cell.split('@')[0]);
      if (!range) return;
      const para = findParagraph(xml.slice(range.start, range.end), 0);
      if (!para) return;

      const rId = `rId${nextRId++}`;
      const mediaName = `signature_${i + 1}.png`;
      zip.file(`word/media/${mediaName}`, img.data);
      relsXml = relsXml.replace(
        '</Relationships>',
        `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/></Relationships>`
      );

      const cy = Math.round((IMAGE_WIDTH_EMU * size.h) / size.w);
      const at = range.start + para.end;
      edits.push({ start: at, end: at, text: buildImageRun(rId, IMAGE_WIDTH_EMU, cy, 9000 + i) });
    });

    zip.file('word/_rels/document.xml.rels', relsXml);
    const ctXml = ctFile.asText();
    if (!/Extension="png"/.test(ctXml)) {
      zip.file(
        '[Content_Types].xml',
        ctXml.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>')
      );
    }
  }

  for (const w of writes) {
    const raw = (w.prefix ?? '') + (w.value ?? '');
    if (!w.value && !w.replace) continue;

    const [key, paraStr] = w.cell.split('@');
    const paraIdx = paraStr ? parseInt(paraStr, 10) : 0;
    const range = cells.get(key);
    if (!range) continue;

    const inner = xml.slice(range.start, range.end);
    const para = findParagraph(inner, paraIdx);
    if (!para) continue;

    const body = inner.slice(para.start, para.end);
    const pPrMatch = body.match(/^<w:pPr>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';
    const rest = body.slice(pPr.length);
    const rPr = firstRPr(rest) || firstRPr(pPr);
    const run = buildRun(raw, rPr);

    if (w.replace) {
      // 문단 내용을 통째로 교체 (pPr 는 유지)
      edits.push({
        start: range.start + para.start,
        end: range.start + para.end,
        text: pPr + run,
      });
    } else {
      // 문단 끝에 run 추가
      const at = range.start + para.end;
      edits.push({ start: at, end: at, text: run });
    }
  }

  // 체크박스: ☐ → ☒, 콘텐츠 컨트롤 상태도 함께 체크로 변경
  if (checkIndexes.length > 0) {
    const boxes: number[] = [];
    for (let p = xml.indexOf('☐'); p !== -1; p = xml.indexOf('☐', p + 1)) boxes.push(p);
    for (const idx of checkIndexes) {
      const at = boxes[idx];
      if (at === undefined) continue;
      edits.push({ start: at, end: at + 1, text: '☒' });

      // 같은 sdt 안의 <w14:checked w14:val="0"/> 를 1 로 (없으면 무시)
      const from = Math.max(0, at - 2000);
      const before = xml.slice(from, at);
      const sdtAt = before.lastIndexOf('<w:sdt>');
      if (sdtAt === -1) continue;
      const checkedRe = /<w14:checked w14:val="0"\/>/g;
      checkedRe.lastIndex = sdtAt;
      const cm = checkedRe.exec(before);
      if (cm) edits.push({ start: from + cm.index, end: from + cm.index + cm[0].length, text: '<w14:checked w14:val="1"/>' });
    }
  }

  // 사진 자리표시 빈 표 제거. 딸린 안내 문구('PHOTO REPORT', '-END-')도 같이 걷어낸다.
  if (dropTable) {
    for (const m of xml.matchAll(/<w:p(?=[ >])[\s\S]*?<\/w:p>/g)) {
      const text = [...m[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(a => a[1]).join('').trim();
      if (/^(photo\s*report|[-–]\s*end\s*[-–]?)$/i.test(text)) {
        edits.push({ start: m.index, end: m.index + m[0].length, text: '' });
      }
    }

    const range = cells.get(`${dropTable}.R0.C0`);
    if (range) {
      const tblStart = Math.max(
        xml.lastIndexOf('<w:tbl ', range.start),
        xml.lastIndexOf('<w:tbl>', range.start)
      );
      const tblEnd = xml.indexOf('</w:tbl>', range.end);
      if (tblStart !== -1 && tblEnd !== -1) {
        edits.push({ start: tblStart, end: tblEnd + '</w:tbl>'.length, text: '' });
      }
    }
  }

  // 뒤에서부터 적용해야 오프셋이 틀어지지 않는다.
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = xml;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  // 템플릿에 남아 있는 빨강·노랑 형광펜 표시는 결과물에서 지운다.
  out = out.replace(/<w:highlight\b[^>]*\/>/g, '');

  zip.file('word/document.xml', out);
  return Buffer.from(
    zip.generate({
      type: 'nodebuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    })
  );
}
