import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPORTS, resolveWrites } from '@/src/lib/reportForms';

const CEC = REPORTS.find(r => r.id === 'cec')!;

test('작동시험/포장/적재입회 토글이 ✔ / N/A 로 셀에 들어간다', () => {
  const { writes } = resolveWrites(CEC, { opTestMark: 'y', packingMark: 'n' });
  assert.deepEqual(
    writes.filter(w => w.cell.startsWith('T2.R1.')),
    [
      { cell: 'T2.R1.C1', value: '✔' },
      { cell: 'T2.R1.C2', value: 'N/A' },
    ],
  );
});

test('단계 분할이 모든 섹션을 덮는다 (빠지는 입력 없음)', () => {
  for (const r of REPORTS) {
    if (!r.steps) continue;
    assert.equal(r.steps.reduce((a, b) => a + b, 0), r.sections.length, r.id);
    assert.ok(r.photoStep !== undefined && r.photoStep < r.steps.length, r.id);
  }
});
