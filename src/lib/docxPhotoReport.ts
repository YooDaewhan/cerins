import PizZip from 'pizzip';
import sharp from 'sharp';

interface ImageData {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
  mediaName: string;
  rId: string;
  widthEmu: number;
  heightEmu: number;
}

// 1 dxa(twip) = 914400/1440 = 635 EMU
// 1px at 96DPI = 914400/96 = 9525 EMU
// → cell content width (px) = (colW_dxa - padding_dxa) * 635 / 9525
//                            = (colW_dxa - padding_dxa) / 15
const CELL_PADDING_DXA = 57 * 2; // 57 dxa each side
const EMU_PER_PX = 9525;
const COLS = 3;
// 사진은 칸 너비를 꽉 채우되 세로로 길어지지 않도록 4:3 으로 잘라 크기를 고정한다.
const ASPECT_H_OVER_W = 3 / 4;

/** 문서의 페이지 크기와 여백을 읽어 실제 본문 너비(dxa)를 반환한다. */
function getContentWidthDxa(docXml: string): number {
  const pgSzMatch  = docXml.match(/<w:pgSz\b([^/]*)\//);
  const pgMarMatch = docXml.match(/<w:pgMar\b([^/]*)\//);

  // 페이지 너비 (기본: US Letter 12240 dxa)
  let pgW = 12240;
  if (pgSzMatch) {
    const m = pgSzMatch[1].match(/\bw:w="(\d+)"/);
    if (m) pgW = parseInt(m[1]);
  }

  // 좌우 여백 (기본: 1800 dxa = 1.25 inch)
  let left = 1800, right = 1800;
  if (pgMarMatch) {
    const lm = pgMarMatch[1].match(/\bw:left="(\d+)"/);
    const rm = pgMarMatch[1].match(/\bw:right="(\d+)"/);
    if (lm) left  = parseInt(lm[1]);
    if (rm) right = parseInt(rm[1]);
  }

  return Math.max(pgW - left - right, 5040); // 최소 3.5 inch
}

export async function buildReport(
  docxBuffer: Buffer,
  photos: { name: string; buffer: Buffer }[]
): Promise<Buffer> {
  const cols = COLS;

  const zip = new PizZip(docxBuffer);

  const docFile = zip.file('word/document.xml');
  const relsFile = zip.file('word/_rels/document.xml.rels');
  const contentTypesFile = zip.file('[Content_Types].xml');

  if (!docFile || !relsFile || !contentTypesFile) {
    throw new Error('올바른 .docx 파일이 아닙니다. (필수 XML 파일 누락)');
  }

  let docXml = docFile.asText();
  let relsXml = relsFile.asText();
  let contentTypesXml = contentTypesFile.asText();

  // Find the highest existing rId number to avoid collisions
  const existingIds = [...relsXml.matchAll(/\bId="rId(\d+)"/g)].map(m => parseInt(m[1], 10));
  let nextRId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 100;

  // 문서 본문 너비를 동적으로 읽어 열 너비 계산
  const tableWidthDxa = getContentWidthDxa(docXml);
  const colW = Math.floor(tableWidthDxa / cols);
  const contentWidthPx = Math.round((colW - CELL_PADDING_DXA) / 15);

  // Resize each image to fill cell width, maintaining aspect ratio
  const images: ImageData[] = await Promise.all(
    photos.map(async (photo, idx) => {
      const resized = await sharp(photo.buffer)
        .resize({
          width: contentWidthPx,
          height: Math.round(contentWidthPx * ASPECT_H_OVER_W),
          fit: 'cover',
          withoutEnlargement: false,
        })
        .jpeg({ quality: 82 })
        .toBuffer();

      const meta = await sharp(resized).metadata();
      const w = meta.width ?? contentWidthPx;
      const h = meta.height ?? contentWidthPx;
      const rId = `rId${nextRId + idx}`;
      const mediaName = `photo_insert_${idx + 1}.jpeg`;

      return {
        name: photo.name,
        buffer: resized,
        width: w,
        height: h,
        mediaName,
        rId,
        widthEmu: w * EMU_PER_PX,
        heightEmu: h * EMU_PER_PX,
      };
    })
  );

  // Write resized images into word/media/ and register relationships
  for (const img of images) {
    zip.file(`word/media/${img.mediaName}`, img.buffer);

    const relEntry =
      `<Relationship Id="${img.rId}"` +
      ` Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"` +
      ` Target="media/${img.mediaName}"/>`;

    relsXml = relsXml.replace('</Relationships>', `  ${relEntry}\n</Relationships>`);
  }
  zip.file('word/_rels/document.xml.rels', relsXml);

  // Ensure JPEG content type is declared in [Content_Types].xml
  if (!contentTypesXml.includes('"jpeg"') && !contentTypesXml.includes("'jpeg'")) {
    contentTypesXml = contentTypesXml.replace(
      '</Types>',
      '  <Default Extension="jpeg" ContentType="image/jpeg"/>\n</Types>'
    );
    zip.file('[Content_Types].xml', contentTypesXml);
  }

  // Ensure drawing-related XML namespaces are declared on the document root
  docXml = ensureNamespaces(docXml);

  // Build the photo section and insert before the final <w:sectPr> (or before </w:body>)
  const sectionXml = buildPhotoSection(images, cols, colW, tableWidthDxa);
  docXml = insertBeforeSectPr(docXml, sectionXml);

  zip.file('word/document.xml', docXml);

  return Buffer.from(
    zip.generate({
      type: 'nodebuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    })
  );
}

/** 완성된 Word 파일과 동영상들을 zip 하나로 묶는다.
 *  docx·동영상 모두 이미 압축된 포맷이라 무압축(STORE)으로 담는다. */
export function bundleWithVideos(
  docx: Buffer,
  docxName: string,
  videos: { name: string; buffer: Buffer }[]
): Buffer {
  const bundle = new PizZip();
  bundle.file(docxName, docx);

  const used = new Set<string>();
  videos.forEach((v, i) => {
    // zip 안에서 경로를 벗어나지 않도록 파일명만 남긴다.
    let safe = v.name.replace(/[\\\/]/g, '_').replace(/^\.+/, '') || `video_${i + 1}`;
    if (used.has(safe)) safe = `${i + 1}_${safe}`;
    used.add(safe);
    bundle.file(`videos/${safe}`, v.buffer);
  });

  return Buffer.from(bundle.generate({ type: 'nodebuffer', compression: 'STORE' }));
}

/** Add required drawing namespaces to <w:document> if missing. */
function ensureNamespaces(docXml: string): string {
  const required: Array<[string, string]> = [
    ['xmlns:wp', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'],
    ['xmlns:a', 'http://schemas.openxmlformats.org/drawingml/2006/main'],
    ['xmlns:pic', 'http://schemas.openxmlformats.org/drawingml/2006/picture'],
    ['xmlns:r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'],
  ];

  for (const [attr, uri] of required) {
    if (!docXml.includes(`${attr}=`)) {
      docXml = docXml.replace(/(<w:document\b)/, `$1 ${attr}="${uri}"`);
    }
  }
  return docXml;
}

/**
 * Insert new XML content before the final <w:sectPr> (section properties)
 * which must remain the last child of <w:body>.
 */
function insertBeforeSectPr(docXml: string, insertXml: string): string {
  const lastSectPr = docXml.lastIndexOf('<w:sectPr');
  if (lastSectPr !== -1) {
    return docXml.slice(0, lastSectPr) + insertXml + '\n' + docXml.slice(lastSectPr);
  }
  return docXml.replace('</w:body>', insertXml + '\n</w:body>');
}

/** Build page-break + heading + one continuous N-column photo table.
 *  사진은 항목 구분 없이 순서대로 이어 붙고, 각 칸 아래에 항목 이름이 캡션으로 들어간다. */
function buildPhotoSection(
  images: ImageData[],
  cols: number,
  colW: number,
  tableWidthDxa: number
): string {
  const gridCols = Array.from({ length: cols }, () => `<w:gridCol w:w="${colW}"/>`).join('');

  const tableRows: string[] = [];
  for (let i = 0; i < images.length; i += cols) {
    // 마지막 줄이 덜 찼으면 남는 칸은 아예 만들지 않는다(빈 칸 없음).
    const chunk = images.slice(i, i + cols);
    // 사진 행과 캡션 행을 나눠야 그 사이에 표 선이 그어진다.
    // cantSplit + 사진 문단의 keepNext 로 둘이 페이지 경계에서 떨어지지 않게 묶는다.
    tableRows.push(
      `<w:tr><w:trPr><w:cantSplit/></w:trPr>${chunk
        .map((img, j) => buildImageCell(img, i + j + 1, colW))
        .join('')}</w:tr>`,
      `<w:tr><w:trPr><w:cantSplit/></w:trPr>${chunk
        .map(img => buildNameCell(img.name, colW))
        .join('')}</w:tr>`
    );
  }

  const table = `<w:tbl>
  <w:tblPr>
    <w:tblW w:w="${tableWidthDxa}" w:type="dxa"/>
    <w:tblInd w:w="0" w:type="dxa"/>
    <w:tblLayout w:type="fixed"/>
    <w:tblBorders>
      <w:top     w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:left    w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:bottom  w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:right   w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    </w:tblBorders>
    <w:tblCellMar>
      <w:top    w:w="57" w:type="dxa"/>
      <w:left   w:w="57" w:type="dxa"/>
      <w:bottom w:w="57" w:type="dxa"/>
      <w:right  w:w="57" w:type="dxa"/>
    </w:tblCellMar>
  </w:tblPr>
  <w:tblGrid>${gridCols}</w:tblGrid>
  ${tableRows.join('\n  ')}
</w:tbl>`;

  const heading = `<w:p>
  <w:pPr>
    <w:jc w:val="center"/>
    <w:spacing w:before="240" w:after="240"/>
  </w:pPr>
  <w:r>
    <w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr>
    <w:t>Photo report</w:t>
  </w:r>
</w:p>`;

  const pageBreak = `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;

  return pageBreak + '\n' + heading + '\n' + table;
}

/** Cell containing a centered image. keepNext 로 아래 캡션 행과 붙어 다닌다. */
function buildImageCell(img: ImageData, docPrId: number, colW: number): string {
  const content = `<w:p>
    <w:pPr>
      <w:keepNext/>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="0"/>
    </w:pPr>
    <w:r>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0"
          xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
          <wp:extent cx="${img.widthEmu}" cy="${img.heightEmu}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="${docPrId}" name="Photo${docPrId}"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
              noChangeAspect="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="${docPrId}" name="Photo${docPrId}"/>
                  <pic:cNvPicPr>
                    <a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>
                  </pic:cNvPicPr>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${img.rId}"
                    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr bwMode="auto">
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${img.widthEmu}" cy="${img.heightEmu}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>`;

  return `<w:tc>
  <w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
  ${content}
</w:tc>`;
}

/** Caption cell (항목 이름), centered under the image. */
function buildNameCell(name: string, colW: number): string {
  return `<w:tc>
  <w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="40" w:after="60"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
      <w:t xml:space="preserve">${escapeXml(name)}</w:t>
    </w:r>
  </w:p>
</w:tc>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
