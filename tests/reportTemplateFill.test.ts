// 검사 보고서 3종 템플릿 채우기 테스트.
// 각 필드에 고유한 값을 넣고, 생성된 .docx 의 해당 셀에서 그 값이 나오는지 확인한다.
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import { REPORTS, resolveWrites, type Field, type FormValues } from "@/src/lib/reportForms";
import { fillTemplate } from "@/src/lib/docxFillTemplate";

const TEMPLATE_DIR = path.join(process.cwd(), "src", "lib", "reportTemplates");

/** 생성된 문서를 T#.R#.C# → 셀 텍스트 맵으로 되읽는다. */
function readCells(buf: Buffer): Map<string, string> {
  const xml = new PizZip(buf).file("word/document.xml")!.asText();
  const map = new Map<string, string>();
  const re = /<w:tbl(?=[ >])|<\/w:tbl>|<w:tr(?=[ >])|<\/w:tr>|<w:tc(?=[ >])|<\/w:tc>/g;
  const stack: { id: number; row: number; cell: number }[] = [];
  const open: { key: string; start: number }[] = [];
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const tag = m[0];
    if (tag === "<w:tbl") stack.push({ id: count++, row: -1, cell: -1 });
    else if (tag === "</w:tbl>") stack.pop();
    else if (tag === "</w:tc>") {
      const o = open.pop();
      if (o) {
        const inner = xml.slice(o.start, m.index);
        const text = [...inner.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
          .map(t => t[1])
          .join("")
          .replace(/&amp;/g, "&");
        map.set(o.key, text);
      }
    } else if (tag === "</w:tr>") continue;
    else {
      const tb = stack[stack.length - 1];
      if (!tb) continue;
      if (tag === "<w:tr") { tb.row++; tb.cell = -1; }
      else {
        tb.cell++;
        open.push({ key: `T${tb.id}.R${tb.row}.C${tb.cell}`, start: xml.indexOf(">", m.index) + 1 });
      }
    }
  }
  return map;
}

function countChecked(buf: Buffer): number {
  const xml = new PizZip(buf).file("word/document.xml")!.asText();
  return (xml.match(/☒/g) ?? []).length;
}

for (const def of REPORTS) {
  test(`${def.label}: 모든 텍스트 필드가 지정한 셀에 들어간다`, () => {
    const values: FormValues = {};
    const expected: { cell: string; value: string }[] = [];
    let radioCount = 0;
    let checkCount = 0;

    const walk = (f: Field) => {
      if (f.t === "text") {
        const v = `VAL_${f.k}`;
        values[f.k] = v;
        expected.push({ cell: f.cell.split("@")[0], value: v });
      } else if (f.t === "radio") {
        values[f.k] = f.opts[0].v;
        if (f.opts[0].cb !== undefined) radioCount++;
        if (f.opts[0].cell) expected.push({ cell: f.opts[0].cell, value: "X" });
      } else if (f.t === "checks") {
        values[f.k] = f.opts.map(o => o.v);
        checkCount += f.opts.length;
      } else {
        // 첫 행만 확인한다. rowBlock 표는 템플릿 행 수를 그대로 채워 뒤 셀 좌표가 밀리지 않게 한다.
        const rows = f.rowBlock ? f.rows.length : 1;
        values[f.k] = Array.from({ length: rows }, () => f.cols.map((_, c) => `G_${f.k}_${c}`));
        f.rows[0].forEach((cell, c) => expected.push({ cell, value: `G_${f.k}_${c}` }));
      }
    };
    def.sections.forEach(s => s.fields.forEach(walk));

    const template = readFileSync(path.join(TEMPLATE_DIR, `${def.id}.docx`));
    const { writes, checks, rowBlocks } = resolveWrites(def, values);
    const out = fillTemplate(template, writes, checks, undefined, rowBlocks);

    const cells = readCells(out);
    for (const e of expected) {
      const got = cells.get(e.cell);
      assert.ok(got !== undefined, `${def.id}: 셀 ${e.cell} 이 존재하지 않음`);
      assert.ok(got!.includes(e.value), `${def.id}: 셀 ${e.cell} 에 "${e.value}" 없음 (실제: "${got}")`);
    }

    assert.equal(countChecked(out), radioCount + checkCount, `${def.id}: 체크된 박스 수 불일치`);
  });

  test(`${def.label}: 값이 없으면 템플릿이 그대로 유지된다`, () => {
    const template = readFileSync(path.join(TEMPLATE_DIR, `${def.id}.docx`));
    const { writes, checks } = resolveWrites(def, {});
    const out = fillTemplate(template, writes, checks);
    assert.equal(countChecked(out), 0);
    assert.deepEqual([...readCells(out).keys()], [...readCells(template).keys()]);
  });
}

test("SCRAP: 컨테이너 표가 입력한 행 수만큼 생기고 뒤 셀이 따라 밀린다", () => {
  const def = REPORTS.find(r => r.id === "scrap")!;
  const template = readFileSync(path.join(TEMPLATE_DIR, "scrap.docx"));

  const run = (n: number) => {
    const values: FormValues = {
      // 열 순서: 크기 / 컨테이너 번호 / 봉인 번호 / 수량(KG) / 방사선량
      containers: Array.from({ length: n }, (_x, i) => ["20", `CONT${i}`, `SEAL${i}`, "20000", "0.1"]),
      bbType: "TAIL",
    };
    const { writes, checks, rowBlocks } = resolveWrites(def, values);
    const out = fillTemplate(template, writes, checks, undefined, rowBlocks);
    return { cells: readCells(out), xml: new PizZip(out).file("word/document.xml")!.asText() };
  };

  // 5행: 남는 5행이 지워지고, 표 뒤의 Break-bulk 칸(R45)이 5행 앞으로 당겨진다.
  const five = run(5);
  assert.ok(five.cells.get("T2.R36.C2")?.includes("CONT4"), "5번째 컨테이너가 마지막 행에 없음");
  assert.ok(five.cells.get("T2.R40.C1")?.includes("TAIL"), "표 뒤 셀이 당겨지지 않음");
  // 숫자만 넣은 수량 칸에는 단위가 붙는다.
  assert.ok(five.cells.get("T2.R32.C4")?.includes("20000 (KG)"), "(KG) 가 붙지 않음");
  assert.equal(five.xml.includes("<w:highlight"), false, "형광펜 표시가 남아 있음");

  // 12행: 템플릿 10행을 넘어 2행이 복제되고 일련번호가 이어진다.
  const twelve = run(12);
  assert.ok(twelve.cells.get("T2.R43.C2")?.includes("CONT11"), "12번째 컨테이너 행이 없음");
  assert.equal(twelve.cells.get("T2.R42.C0"), "11", "복제 행의 일련번호가 어긋남");
  assert.equal(twelve.cells.get("T2.R43.C0"), "12", "복제 행의 일련번호가 어긋남");
  assert.ok(twelve.cells.get("T2.R47.C1")?.includes("TAIL"), "표 뒤 셀이 밀리지 않음");
});

test("사진을 붙이면 템플릿의 자리표시 문구(PHOTO REPORT / -END-)가 사라진다", () => {
  for (const def of REPORTS) {
    const template = readFileSync(path.join(TEMPLATE_DIR, `${def.id}.docx`));
    const { writes, checks, rowBlocks } = resolveWrites(def, {});
    const out = fillTemplate(template, writes, checks, def.photoTable, rowBlocks);
    const text = [...new PizZip(out).file("word/document.xml")!.asText()
      .matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join("\n");
    assert.equal(/^\s*(PHOTO REPORT|[-–]\s*end\s*[-–]?)\s*$/im.test(text), false, `${def.id}: 자리표시 문구가 남음`);
  }
});

test("CEC: 컨테이너 표도 입력한 행 수만큼 생긴다", () => {
  const def = REPORTS.find(r => r.id === "cec")!;
  const template = readFileSync(path.join(TEMPLATE_DIR, "cec.docx"));

  const run = (n: number) => {
    const values: FormValues = {
      // 열 순서: Sl.No. / 종류 / LCL·FCL / 컨테이너 번호 / 봉인 번호 / 수량
      containers: Array.from({ length: n }, (_x, i) => [`${i + 1}`, "20", "FCL", `CONT${i}`, `SEAL${i}`, "10 pallets"]),
      bbType: "TAIL",
    };
    const { writes, checks, rowBlocks } = resolveWrites(def, values);
    return readCells(fillTemplate(template, writes, checks, undefined, rowBlocks));
  };

  // 템플릿 12행 → 4행. 표 뒤의 Break-bulk 칸(R17)이 8행 앞으로 당겨진다.
  const four = run(4);
  assert.ok(four.get("T4.R6.C3")?.includes("CONT3"), "4번째 컨테이너가 마지막 행에 없음");
  assert.ok(four.get("T4.R9.C1")?.includes("TAIL"), "표 뒤 셀이 당겨지지 않음");

  // 15행: 3행이 복제된다. 원본 행에 일련번호가 없으므로 번호도 붙지 않는다.
  const fifteen = run(15);
  assert.ok(fifteen.get("T4.R17.C3")?.includes("CONT14"), "15번째 컨테이너 행이 없음");
  assert.equal(fifteen.get("T4.R17.C0"), "15", "복제 행의 Sl. No. 가 입력값과 다름");
  assert.ok(fifteen.get("T4.R20.C1")?.includes("TAIL"), "표 뒤 셀이 밀리지 않음");
});

test("한글 사전: 폼에 쓰이는 모든 문자열에 번역이 있다", async () => {
  const { KO } = await import("@/src/lib/reportFormsKo");
  const missing: string[] = [];
  for (const def of REPORTS) {
    const add = (s: string) => { if (!KO[s]) missing.push(s); };
    add(def.title);
    for (const sec of def.sections) {
      add(sec.title);
      for (const f of sec.fields) {
        add(f.label);
        if (f.t === "radio" || f.t === "checks") f.opts.forEach(o => add(o.label));
        if (f.t === "grid") f.cols.forEach(add);
      }
    }
  }
  assert.deepEqual(missing, [], `번역 누락: ${missing.join(", ")}`);
});
