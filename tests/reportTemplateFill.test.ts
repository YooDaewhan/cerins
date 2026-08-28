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
        // 첫 행만 채운다
        values[f.k] = [f.cols.map((_, c) => `G_${f.k}_${c}`)];
        f.rows[0].forEach((cell, c) => expected.push({ cell, value: `G_${f.k}_${c}` }));
      }
    };
    def.sections.forEach(s => s.fields.forEach(walk));

    const template = readFileSync(path.join(TEMPLATE_DIR, `${def.id}.docx`));
    const { writes, checks } = resolveWrites(def, values);
    const out = fillTemplate(template, writes, checks);

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
