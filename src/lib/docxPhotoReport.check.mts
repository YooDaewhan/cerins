// 사진 삽입 결과 자체 점검: 3열 고정, 4:3 크롭, 캡션 = 항목 이름.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import PizZip from 'pizzip';
import sharp from 'sharp';
import { buildReport } from './docxPhotoReport';
import { expandPhotoEntries, REPORTS } from './reportForms';

async function main() {
  const base = readFileSync('src/lib/reportTemplates/cec.docx');
  const photo = (w: number, h: number) =>
    sharp({ create: { width: w, height: h, channels: 3, background: '#888888' } }).png().toBuffer();

  const photos = [
    { name: '1. Inspection site', buffer: await photo(1200, 400) },
    { name: '1. Inspection site', buffer: await photo(400, 1600) },
    { name: '2. Nameplate', buffer: await photo(800, 600) },
    { name: '7. Sealing', buffer: await photo(800, 600) },
  ];

  const out = await buildReport(base, photos);
  const zip = new PizZip(out);
  const xml = zip.file('word/document.xml')!.asText();

  const added = xml.slice(xml.lastIndexOf('<w:br w:type="page"/>'));
  assert.equal((added.match(/<w:gridCol /g) ?? []).length, 3, '3열이 아님');
  assert.equal((added.match(/<w:tbl>/g) ?? []).length, 1, '표가 한 개로 이어지지 않음');
  for (const p of photos) assert.ok(xml.includes(p.name), `캡션 누락: ${p.name}`);
  assert.ok(xml.includes('<w:cantSplit/>'), 'cantSplit 누락');
  assert.equal((xml.match(/<w:br w:type="page"\/>/g) ?? []).length, 1, '페이지 나눔이 이어지지 않음');

  const sizes = await Promise.all(
    photos.map(async (_p, i) => {
      const m = await sharp(zip.file(`word/media/photo_insert_${i + 1}.jpeg`)!.asNodeBuffer()).metadata();
      return `${m.width}x${m.height}`;
    })
  );
  assert.equal(new Set(sizes).size, 1, `사진 크기 제각각: ${sizes}`);
  const [w, h] = sizes[0].split('x').map(Number);
  assert.ok(Math.abs(w / h - 4 / 3) < 0.02, `비율이 4:3 아님: ${sizes[0]}`);

  // 물품 묶음 반복: CEC 2~4번이 통째로 늘어나고 번호는 이어서 매겨진다.
  const cec = REPORTS.find(r => r.id === 'cec')!;
  const one = expandPhotoEntries(cec, 1);
  assert.deepEqual(one.map(e => e.label), cec.photoCategories, '묶음 1개일 때 원래 목록과 달라짐');

  const two = expandPhotoEntries(cec, 2);
  assert.deepEqual(
    two.map(e => e.label),
    ['Inspection site', 'Nameplate', 'Goods condition', 'Packing',
      'Nameplate', 'Goods condition', 'Packing', 'Shipping mark', 'Container', 'Sealing'],
    '물품 추가 순서가 어긋남'
  );
  assert.equal(new Set(two.map(e => e.key)).size, two.length, 'key 중복');
  assert.deepEqual(two.filter(e => e.ci === cec.photoGroup!.nameAt).map(e => e.gi), [0, 1], 'Nameplate 묶음 번호 어긋남');

  console.log('ok:', sizes[0], `${photos.length} photos`, `entries 1→${one.length} 2→${two.length}`);
}
main();
