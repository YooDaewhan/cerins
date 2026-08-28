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

interface Edit {
  start: number;
  end: number;
  text: string;
}

const CELL_RANGE_RE = /<w:tbl(?=[ >])|<\/w:tbl>|<w:tr(?=[ >])|<\/w:tr>|<w:tc(?=[ >])|<\/w:tc>/g;

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
  dropTable?: string
): Buffer {
  const zip = new PizZip(templateBuffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('템플릿이 올바른 .docx 파일이 아닙니다.');

  const xml = docFile.asText();
  const cells = indexCells(xml);
  const edits: Edit[] = [];

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

  // 사진 자리표시 빈 표 제거
  if (dropTable) {
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

  zip.file('word/document.xml', out);
  return Buffer.from(
    zip.generate({
      type: 'nodebuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    })
  );
}
