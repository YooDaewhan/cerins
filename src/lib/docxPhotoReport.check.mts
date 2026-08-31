// 사진 삽입 결과 자체 점검: 3열 고정, 4:3 크롭, 캡션 = 항목 이름.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import PizZip from 'pizzip';
import sharp from 'sharp';
import { buildReport, bundleWithVideos } from './docxPhotoReport';
import { dropGroup, expandPhotoEntries, REPORTS } from './reportForms';

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
  assert.ok(xml.includes('<w:keepNext/>'), 'keepNext 누락 — 사진과 캡션이 떨어질 수 있음');
  // 사진 행 + 캡션 행이 따로 있어야 그 사이에 표 선이 그어진다.
  assert.equal((added.match(/<w:tr>/g) ?? []).length, 4, '사진 행/캡션 행이 분리되지 않음');
  // 4장 / 3열 → 마지막 줄은 1칸만. 남는 칸을 빈 칸으로 채우지 않는다.
  assert.equal((added.match(/<w:tc>/g) ?? []).length, 2 * photos.length, '빈 칸이 만들어짐');
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

  // 묶음 삭제: 해당 묶음의 사진/이름만 빠지고 뒤 번호가 한 칸 당겨진다.
  const before = {
    'cec.0': 'site',
    'cec.1#0': 'nameplate0',
    'cec.2#0': 'cond0',
    'cec.1#1': 'nameplate1',
    'cec.item#0': 'A',
    'cec.item#1': 'B',
    'scrap.1#0': '다른 탭',
  };
  assert.deepEqual(dropGroup(before, 'cec', 0), {
    'cec.0': 'site',
    'cec.1#0': 'nameplate1',
    'cec.item#0': 'B',
    'scrap.1#0': '다른 탭',
  }, '묶음 삭제 후 키가 어긋남');
  assert.deepEqual(dropGroup(before, 'cec', 1), {
    'cec.0': 'site',
    'cec.1#0': 'nameplate0',
    'cec.2#0': 'cond0',
    'cec.item#0': 'A',
    'scrap.1#0': '다른 탭',
  }, '마지막 묶음 삭제가 앞 묶음을 건드림');

  // SCRAP: 9~13번(Container ~ Sealing)이 컨테이너 단위로 반복된다.
  const scrap = REPORTS.find(r => r.id === 'scrap')!;
  const sg = scrap.photoGroup!;
  const s2 = expandPhotoEntries(scrap, 2);
  assert.equal(s2.length, scrap.photoCategories!.length + (sg.to - sg.from + 1), 'SCRAP 묶음 반복 개수가 어긋남');
  assert.deepEqual(
    s2.slice(sg.from, sg.from + 2 * (sg.to - sg.from + 1)).map(e => e.label),
    [...scrap.photoCategories!.slice(sg.from, sg.to + 1), ...scrap.photoCategories!.slice(sg.from, sg.to + 1)],
    'SCRAP 컨테이너 묶음 순서가 어긋남'
  );
  assert.equal(s2[s2.length - 1].label, 'Stuffing process video', '묶음 뒤 항목이 밀려남');
  assert.equal(sg.nameAt, undefined, 'SCRAP 은 이름 입력칸 없음');

  // 동영상은 Word 대신 zip 에 따로 담긴다.
  const vid = (n: string) => ({ name: n, buffer: Buffer.from('fake video') });
  const bundle = new PizZip(
    bundleWithVideos(out, 'scrap_report.docx', [
      vid('stuffing.mp4'),
      vid('../../etc/passwd.mp4'),
      vid('stuffing.mp4'),
    ])
  );
  const names = Object.keys(bundle.files).sort();
  assert.deepEqual(names, [
    'scrap_report.docx',
    'videos/3_stuffing.mp4',
    'videos/_.._etc_passwd.mp4',
    'videos/stuffing.mp4',
  ], `zip 구성이 어긋남: ${names}`);
  assert.ok(
    bundle.file('scrap_report.docx')!.asNodeBuffer().length === out.length,
    'zip 안의 Word 파일이 손상됨'
  );

  console.log('ok:', sizes[0], `${photos.length} photos`, `cec ${one.length}/${two.length}`, `scrap ${s2.length}`, `zip ${names.length}`);
}
main();
