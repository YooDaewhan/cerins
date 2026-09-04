/**
 * 검사 보고서 3종(CEC / SCRAP / PSIC)의 입력 폼 정의.
 * 화면 렌더링(app/photo-report/page.tsx)과 Word 채우기(app/api/photo-report/route.ts)가
 * 이 한 파일을 공유한다. cell/cb 값은 원본 템플릿을 파싱해 얻은 좌표다.
 *   cell: 'T{표}.R{행}.C{열}[@문단]'   cb: 문서 내 ☐ 등장 순서(0-based)
 */

export type Field =
  | { t: 'text'; k: string; label: string; cell: string; lines?: number; replace?: boolean; prefix?: string; ph?: string; date?: true; today?: true;
      /** 다음 우편번호 검색 버튼을 붙인다. */ addr?: true }
  /** 마우스·터치로 그린 서명. 값은 PNG data URL 이고 해당 셀에 그림으로 들어간다. */
  | { t: 'sign'; k: string; label: string; cell: string }
  | { t: 'radio'; k: string; label: string; opts: { v: string; label: string; cb?: number; cell?: string; value?: string }[] }
  | { t: 'checks'; k: string; label: string; opts: { v: string; label: string; cb: number }[] }
  | { t: 'grid'; k: string; label: string; cols: string[]; rows: string[][]; dateCols?: number[];
      /** 입력한 행 수에 맞춰 표 행을 늘리거나 줄인다(행 수 제한 없음). rows 와 같은 행 범위. */
      rowBlock?: { table: number; from: number; to: number };
      /** 숫자만 입력했을 때 뒤에 붙일 단위. { 열번호: 'KG' } */
      unitCols?: Record<number, string> };

export interface Section {
  title: string;
  fields: Field[];
}

export interface ReportDef {
  id: string;
  label: string;
  title: string;
  /** 사진은 문서 끝에 따로 붙이므로 템플릿의 빈 사진 표는 제거한다. */
  photoTable?: string;
  /** 사진 첨부 항목. 항목별로 사진을 받고, 캡션(제목)으로 쓴다. */
  photoCategories?: string[];
  /** 동영상을 받는 photoCategories 위치(0-based). Word 에는 안 들어가고 zip 에 따로 담긴다. */
  videoAt?: number;
  /** 대상 하나가 여러 항목을 차지할 때, 반복 추가·삭제할 수 있는 photoCategories 구간(0-based).
   *  label: 묶음 단위 이름(화면 표시용). nameAt: 지정하면 그 항목 캡션 뒤에 `-이름` 이 붙는다. */
  photoGroup?: { from: number; to: number; label: string; nameAt?: number;
    /** 묶음 항목 캡션에 grid 값을 자동으로 넣는다. at = { photoCategories 위치: grid 열번호 } */
    fill?: { grid: string; at: Record<number, number> } };
  sections: Section[];
  /** 입력 폼을 여러 화면으로 나눈다. 각 값은 그 단계에 들어가는 sections 개수(합 = sections.length).
   *  Word 출력에는 영향이 없다 — 화면 분할일 뿐이다. */
  steps?: number[];
  /** 사진 첨부 칸을 보여줄 단계(0-based). steps 가 있을 때만 쓴다. */
  photoStep?: number;
}

/** 연속된 행/열 좌표로 grid rows 를 만든다. */
function gridRows(table: number, rowFrom: number, rowTo: number, colFrom: number, colTo: number): string[][] {
  const rows: string[][] = [];
  for (let r = rowFrom; r <= rowTo; r++) {
    const row: string[] = [];
    for (let c = colFrom; c <= colTo; c++) row.push(`T${table}.R${r}.C${c}`);
    rows.push(row);
  }
  return rows;
}

/** 검사 시행 여부 토글. 셀에는 ✔ / N/A 로 들어간다. */
const MARK = (cell: string) => [
  { v: 'y', label: 'Y', cell, value: '✔' },
  { v: 'n', label: 'N', cell, value: 'N/A' },
];

const YESNO = (yes: number, no: number) => [
  { v: 'yes', label: 'Yes', cb: yes },
  { v: 'no', label: 'No', cb: no },
];

// ─────────────────────────────────────────────── CEC (RE-KR-INS-IN-002)
const CEC: ReportDef = {
  id: 'cec',
  label: 'CEC',
  title: 'CEC Inspection Report',
  photoTable: 'T12',
  photoCategories: [
    'Inspection site',
    'Nameplate',
    'Goods condition',
    'Packing',
    'Shipping mark',
    'Container',
    'Sealing',
  ],
  // 2~4번(Nameplate / Goods condition / Packing)은 물품 하나 단위라 통째로 반복된다.
  photoGroup: { from: 1, to: 3, label: 'Item', nameAt: 1 },
  // 5단계: 개요 / 시각·결과 / 사진·문서 / 제품·결론 / 서명
  steps: [3, 4, 2, 3, 2],
  photoStep: 2,
  sections: [
    {
      title: 'General Information',
      fields: [
        { t: 'text', k: 'jobFileNo', label: 'Job File No', cell: 'T0.R0.C1' },
        { t: 'text', k: 'date', label: 'Date', cell: 'T0.R0.C2', prefix: ' ', date: true, today: true },
        { t: 'text', k: 'client', label: 'Client', cell: 'T0.R1.C1' },
      ],
    },
    {
      title: 'GOODS DESCRIPTION / DECLARED / APPLIED FOR INSPECTION',
      fields: [
        { t: 'text', k: 'declaredGoods', label: 'Declared goods description', cell: 'T1.R1.C0', lines: 3 },
        { t: 'text', k: 'productName', label: 'Product name (Representative)', cell: 'T1.R1.C1' },
        { t: 'text', k: 'totalQty', label: 'Total Quantity', cell: 'T1.R1.C2' },
      ],
    },
    {
      title: 'INSPECTED',
      fields: [
        { t: 'text', k: 'inspDate', label: 'Date of Inspection', cell: 'T2.R1.C0', date: true },
        { t: 'radio', k: 'opTestMark', label: 'Operation Test', opts: MARK('T2.R1.C1') },
        { t: 'radio', k: 'packingMark', label: 'Packing', opts: MARK('T2.R1.C2') },
        { t: 'radio', k: 'loadingMark', label: 'Loading Supervision', opts: MARK('T2.R1.C3') },
        { t: 'text', k: 'place', label: 'Place of Inspection and Country (full address)', cell: 'T2.R2.C1', lines: 3, addr: true },
        { t: 'text', k: 'roundTrip', label: 'Round-Trip Travel Time (00:00 h)', cell: 'T2.R4.C1' },
        { t: 'text', k: 'totalDuration', label: 'Total Duration of Inspection Hours (00:00 h)', cell: 'T2.R4.C2' },
      ],
    },
    {
      title: 'TIME OF OPERATION TEST / PACKING INSPECTION / LOADING SUPERVISION',
      fields: [
        {
          t: 'grid',
          k: 'times',
          label: 'Time of Operation Test / Packing Inspection / Loading Supervision',
          cols: [
            'OT Date', 'OT From', 'OT To',
            'Pack Date', 'Pack From', 'Pack To',
            'Load Date', 'Load From', 'Load To',
          ],
          rows: gridRows(2, 7, 10, 1, 9),
          dateCols: [0, 3, 6],
        },
      ],
    },
    {
      title: 'OPERATION TEST RESULT',
      fields: [
        {
          t: 'radio', k: 'opResult', label: 'Result',
          opts: [
            { v: 'sat', label: 'Satisfactory', cb: 0 },
            { v: 'unsat', label: 'Unsatisfactory', cb: 1 },
            { v: 'cond', label: 'Conditional', cb: 2 },
          ],
        },
        { t: 'text', k: 'opReason', label: 'If unsatisfactory result or conditional, specify the reasons', cell: 'T3.R1.C0@1', lines: 3 },
      ],
    },
    {
      title: 'PACKING',
      fields: [
        {
          t: 'radio', k: 'packType', label: 'TYPE OF PACKING',
          opts: [
            { v: 'bulk', label: 'Bulk', cb: 3 },
            { v: 'breakbulk', label: 'Break-bulk', cb: 4 },
            { v: 'container', label: 'Container', cb: 5 },
            { v: 'other', label: 'Other', cb: 6 },
          ],
        },
        {
          t: 'grid', k: 'containers', label: 'In case of break-bulk and/or container cargo',
          cols: ['Sl. No.', 'Type of container (20’, 40’ …)', 'LCL / FCL', 'Container No.', 'Seal No.', 'Quantity & type of break-bulk packing'],
          rows: gridRows(4, 3, 14, 0, 5),
          rowBlock: { table: 4, from: 3, to: 14 },
        },
        { t: 'text', k: 'bbType', label: 'Break-bulk: Type of packing', cell: 'T4.R17.C1' },
        { t: 'text', k: 'bbQty', label: 'Break-bulk: Quantity of packing', cell: 'T4.R17.C3' },
        { t: 'text', k: 'bbRemark', label: 'Break-bulk: Remark if any', cell: 'T4.R18.C0@1', lines: 2 },
        { t: 'text', k: 'otherRemark', label: 'Other packing: Remark if any', cell: 'T4.R20.C0@1', lines: 2 },
      ],
    },
    {
      title: 'INSPECTION RESULT OF PACKING',
      fields: [
        {
          t: 'radio', k: 'packResult', label: 'Result',
          opts: [
            { v: 'sat', label: 'Satisfactory', cb: 7 },
            { v: 'unsat', label: 'Unsatisfactory', cb: 8 },
            { v: 'cond', label: 'Conditional', cb: 9 },
          ],
        },
        { t: 'text', k: 'packReason', label: 'If unsatisfactory result or conditional, specify the reasons', cell: 'T5.R1.C0@1', lines: 3 },
      ],
    },
    {
      title: 'PHOTOGRAPHS OF INSPECTION ACTIVITY',
      fields: [
        { t: 'radio', k: 'ph1', label: 'Photograph(s) of the place of inspection with inspector', opts: YESNO(10, 11) },
        { t: 'radio', k: 'ph2', label: 'Photograph(s) of operation test at the place of inspection', opts: YESNO(12, 13) },
        { t: 'radio', k: 'ph3', label: 'Photographs of each goods/package showing their name-plates (at least 4)', opts: YESNO(14, 15) },
        { t: 'radio', k: 'ph4', label: 'Photographs of packing process', opts: YESNO(16, 17) },
        { t: 'radio', k: 'ph5', label: 'Photographs of container stuffing and sealing process (at least 6)', opts: YESNO(18, 19) },
      ],
    },
    {
      title: 'DOCUMENTS EXAMINED DURING INSPECTION',
      fields: [
        {
          t: 'checks', k: 'docs', label: 'Documents examined',
          opts: [
            { v: 'checklist', label: 'Inspection Checklist/Points provided by Coordinator', cb: 20 },
            { v: 'price', label: 'Original (Purchase) Price Copy', cb: 21 },
            { v: 'packingList', label: 'Packing List', cb: 22 },
            { v: 'proforma', label: 'Proforma Invoice', cb: 23 },
            { v: 'others', label: 'Others', cb: 24 },
          ],
        },
        { t: 'text', k: 'docsOther', label: 'Others – specify and attach/enclose', cell: 'T7.R5.C1@1', lines: 2 },
      ],
    },
    {
      title: 'DETAIL OF PRODUCT',
      fields: [
        {
          t: 'grid', k: 'products', label: 'Product details',
          cols: [
            'Goods description',
            'Re-conditioned/repaired (Y/N)',
            'Month & Year of manufacture',
            'Manufacturer',
            'Quantity',
            'Model No./Serial No.',
            'Country of Origin',
            'Nameplate (Y/N)',
          ],
          rows: gridRows(8, 1, 6, 1, 8),
        },
      ],
    },
    {
      title: 'ATTACHMENT',
      fields: [
        {
          t: 'radio', k: 'hasAttachment', label: 'Attachment (if any)',
          opts: [
            { v: 'yes', label: 'YES', cb: 25 },
            { v: 'no', label: 'NO', cb: 26 },
          ],
        },
        { t: 'grid', k: 'attachments', label: 'If YES, list down and attach/enclose', cols: ['Attachment'], rows: gridRows(9, 1, 5, 1, 1) },
      ],
    },
    {
      title: 'CONCLUSION OF INSPECTION',
      fields: [
        {
          t: 'radio', k: 'conclusion', label: 'Result',
          opts: [
            { v: 'sat', label: 'Satisfactory', cb: 27 },
            { v: 'cond', label: 'Conditional', cb: 28 },
            { v: 'reject', label: 'Reject', cb: 29 },
            { v: 'abortive', label: 'Abortive', cb: 30 },
            { v: 'reinspection', label: 'Re-inspection', cb: 31 },
          ],
        },
        { t: 'text', k: 'conclusionReason', label: 'If not satisfactory, specify the reasons', cell: 'T10.R1.C0@1', lines: 3 },
      ],
    },
    {
      title: 'Applicant’s person(s) in charge',
      fields: [
        { t: 'text', k: 'appCompany', label: 'Company name', cell: 'T11.R0.C1' },
        { t: 'text', k: 'appName', label: 'Name', cell: 'T11.R1.C1' },
        { t: 'text', k: 'appTitle', label: 'Title', cell: 'T11.R2.C1' },
        { t: 'text', k: 'appContact', label: 'Contact points (Tel., email, etc.)', cell: 'T11.R3.C1' },
        { t: 'sign', k: 'appSign', label: 'Signature', cell: 'T11.R4.C1' },
        { t: 'text', k: 'appDate', label: 'Date', cell: 'T11.R5.C1', date: true },
      ],
    },
    {
      title: 'INSPECTOR',
      fields: [
        { t: 'text', k: 'insCompany', label: 'Company name or CERINS branch office name', cell: 'T11.R9.C1' },
        { t: 'text', k: 'insName', label: 'Name', cell: 'T11.R10.C1' },
        { t: 'text', k: 'insTitle', label: 'Title', cell: 'T11.R11.C1' },
        { t: 'sign', k: 'insSign', label: 'Signature', cell: 'T11.R12.C1' },
        { t: 'text', k: 'insDate', label: 'Date', cell: 'T11.R13.C1', date: true },
      ],
    },
  ],
};

// ─────────────────────────────────────────────── SCRAP (RE-KR-INS-IN-003)
const SCRAP: ReportDef = {
  id: 'scrap',
  label: 'SCRAP',
  title: 'PSIC Inspection Report (Scrap)',
  photoTable: 'T4',
  photoCategories: [
    'Inspection site',
    'Inspection site with inspector',
    'Radiation detector (Serial No. )',
    'Radioactive level of background',
    'Products',
    'Measuring Balded metal size (W: L: H: )',
    'PMI Testing',
    'Radioactive level of the scrap',
    'Container (No. )',
    'Empty container',
    'Radioactive level of the container',
    'Stuffing',
    'Sealing (No. )',
    'Weight certificate',
    'Stuffing process video',
  ],
  // 9~13번(Container ~ Sealing)은 컨테이너 하나 단위라 통째로 반복된다.
  // 컨테이너 번호(1열) / 봉인 번호(2열)는 PACKING 표에 입력한 값이 캡션에 자동으로 들어간다.
  photoGroup: { from: 8, to: 12, label: 'Container', fill: { grid: 'containers', at: { 8: 1, 12: 2 } } },
  videoAt: 14, // 15. Stuffing process video
  sections: [
    {
      title: 'General Information',
      fields: [
        { t: 'text', k: 'jobFileNo', label: 'Job File No.', cell: 'T0.R0.C0', replace: true, prefix: 'Job File No. ', ph: 'CERINS-XXXXXX/KR' },
        { t: 'text', k: 'date', label: 'Date', cell: 'T0.R0.C2', replace: true, date: true, today: true },
      ],
    },
    {
      title: 'DECLARED / APPLIED FOR INSPECTION',
      fields: [
        { t: 'text', k: 'importer', label: 'Importer name', cell: 'T1.R0.C1' },
        { t: 'text', k: 'exporter', label: 'Exporter name', cell: 'T1.R1.C1' },
        { t: 'text', k: 'productName', label: 'Product name', cell: 'T1.R3.C1' },
        { t: 'text', k: 'quantity', label: 'Quantity', cell: 'T1.R3.C2' },
        { t: 'text', k: 'netWeight', label: 'Net weight', cell: 'T1.R3.C3' },
        {
          t: 'checks', k: 'gradeKind', label: 'Grade type',
          opts: [
            { v: 'isri', label: 'ISRI grade', cb: 0 },
            { v: 'steel', label: 'Steel grade', cb: 1 },
            { v: 'others', label: 'Others', cb: 2 },
          ],
        },
        { t: 'text', k: 'isriGrade', label: 'ISRI grade', cell: 'T1.R4.C3' },
        { t: 'text', k: 'steelGrade', label: 'Steel grade', cell: 'T1.R5.C3' },
        { t: 'text', k: 'otherGrade', label: 'Others', cell: 'T1.R6.C3' },
      ],
    },
    {
      title: 'INSPECTED',
      fields: [
        { t: 'text', k: 'inspDate', label: 'Date of inspection', cell: 'T2.R0.C1', date: true },
        { t: 'text', k: 'timeFrom', label: 'Time of Inspection – From', cell: 'T2.R2.C1' },
        { t: 'text', k: 'timeTo', label: 'Time of Inspection – To', cell: 'T2.R2.C2' },
        { t: 'text', k: 'roundTrip', label: 'Round-trip Travel Time', cell: 'T2.R2.C3' },
        { t: 'text', k: 'totalDuration', label: 'Total Duration of Inspection Hours', cell: 'T2.R2.C4' },
        { t: 'text', k: 'place', label: 'Place of inspection (full address)', cell: 'T2.R3.C1', lines: 3 },
        { t: 'text', k: 'qtyInspected', label: 'Quantity inspected / presented for inspection', cell: 'T2.R4.C1' },
        { t: 'text', k: 'countryOrigin', label: 'Country of origin', cell: 'T2.R5.C1' },
        { t: 'text', k: 'netWeight2', label: 'Weight – Net weight', cell: 'T2.R6.C2' },
        { t: 'text', k: 'grossWeight', label: 'Weight – Gross weight', cell: 'T2.R6.C4' },
      ],
    },
    {
      title: 'QUALITY',
      fields: [
        {
          t: 'radio', k: 'quality', label: 'Quality condition/grade',
          opts: [
            { v: 'scrap', label: 'Scrap', cb: 3 },
            { v: 'secondary', label: 'Secondary', cb: 4 },
            { v: 'defective', label: 'Defective', cb: 5 },
            { v: 'others', label: 'Others', cb: 6 },
          ],
        },
        { t: 'text', k: 'qualityOther', label: 'If other conditions or others are applicable, please specify', cell: 'T2.R9.C1@1', lines: 2 },
        {
          t: 'radio', k: 'shred', label: 'Shredded or Un-shredded',
          opts: [
            { v: 'shredded', label: 'Shredded', cb: 7 },
            { v: 'unshredded', label: 'Un-shredded', cb: 8 },
            { v: 'mixed', label: 'Mixed', cb: 9 },
          ],
        },
        { t: 'text', k: 'shredNote', label: 'If mixed, please specify', cell: 'T2.R11.C1@1', lines: 2 },
      ],
    },
    {
      title: 'RADIATION METER USED FOR INSPECTION',
      fields: [
        { t: 'text', k: 'meterMaker', label: 'Manufacturer', cell: 'T2.R13.C1' },
        { t: 'text', k: 'meterModel', label: 'Model', cell: 'T2.R14.C1' },
        { t: 'text', k: 'meterSerial', label: 'Serial No.', cell: 'T2.R15.C1' },
        { t: 'text', k: 'calLast', label: 'Last date of calibration', cell: 'T2.R16.C1', date: true },
        { t: 'text', k: 'calNext', label: 'Next date of calibration', cell: 'T2.R17.C1', date: true },
      ],
    },
    {
      title: 'RADIATION LEVEL FOUND',
      fields: [
        { t: 'text', k: 'bgRadiation', label: 'Background radiation level (µSv/h)', cell: 'T2.R19.C1' },
        { t: 'text', k: 'maxRadiation', label: 'Maximum radiation level on the scrap (µSv/h)', cell: 'T2.R20.C1' },
        {
          t: 'radio', k: 'radResult', label: 'Result',
          opts: [
            { v: 'compliance', label: 'Compliance', cb: 10 },
            { v: 'unsat', label: 'Unsatisfactory', cb: 11 },
          ],
        },
        { t: 'text', k: 'radReason', label: 'If unsatisfactory result, specify the reasons', cell: 'T2.R23.C0@1', lines: 2 },
      ],
    },
    {
      title: 'EXPLOSIVE MATERIAL',
      fields: [
        {
          t: 'radio', k: 'expResult', label: 'Result',
          opts: [
            { v: 'compliance', label: 'Compliance', cb: 12 },
            { v: 'unsat', label: 'Unsatisfactory', cb: 13 },
          ],
        },
        { t: 'text', k: 'expReason', label: 'If unsatisfactory result, specify the reasons', cell: 'T2.R27.C0@1', lines: 2 },
      ],
    },
    {
      title: 'PACKING',
      fields: [
        {
          t: 'radio', k: 'packType', label: 'TYPE OF PACKING',
          opts: [
            { v: 'bulk', label: 'Bulk', cb: 14 },
            { v: 'breakbulk', label: 'Break-bulk', cb: 15 },
            { v: 'container', label: 'Container', cb: 16 },
            { v: 'other', label: 'Other', cb: 17 },
          ],
        },
        {
          t: 'grid', k: 'containers', label: 'In case of break-bulk and/or container cargo',
          cols: ['Size of container (20’/40’…)', 'Container No.', 'Seal No.', 'Quantity & type (KG)', 'Container Radiation Level (µSv/h)'],
          rows: gridRows(2, 32, 41, 1, 5),
          rowBlock: { table: 2, from: 32, to: 41 },
          unitCols: { 3: 'KG' },
        },
        { t: 'text', k: 'bbType', label: 'Break-bulk: Type of packing', cell: 'T2.R45.C1', replace: true, ph: 'N/A' },
        { t: 'text', k: 'bbQty', label: 'Break-bulk: Quantity of packing', cell: 'T2.R45.C3', replace: true, ph: 'N/A' },
        { t: 'text', k: 'bbRemark', label: 'Break-bulk: Remark if any', cell: 'T2.R46.C0@1', lines: 2 },
        { t: 'text', k: 'otherRemark', label: 'Other packing: Remark if any', cell: 'T2.R48.C0@1', lines: 2 },
      ],
    },
    {
      title: 'ATTACHMENTS',
      fields: [
        { t: 'radio', k: 'at1', label: 'Pictures taken during inspection (date & time shown)', opts: YESNO(18, 19) },
        { t: 'radio', k: 'at2', label: 'Photograph(s) or video clipping of the place of inspection with PSIA inspector', opts: YESNO(20, 21) },
        { t: 'radio', k: 'at3', label: 'Photograph(s) or video clipping of the testing instrument(s)', opts: YESNO(22, 23) },
        { t: 'radio', k: 'at4', label: 'Photograph(s) or video clipping of the process of stuffing of containers', opts: YESNO(24, 25) },
        { t: 'radio', k: 'at5', label: 'Photograph(s) or video clipping of the sealing process', opts: YESNO(26, 27) },
        { t: 'radio', k: 'at6', label: 'Video clips (at least 5 minutes)', opts: YESNO(28, 29) },
        { t: 'radio', k: 'at7', label: 'Weight tickets', opts: YESNO(30, 31) },
        {
          t: 'checks', k: 'docs', label: 'Documents examined during inspection',
          opts: [
            { v: 'checklist', label: 'Inspection checklist/point provided by Coordinator', cb: 32 },
            { v: 'packingList', label: 'Packing list', cb: 33 },
            { v: 'proforma', label: 'Proforma invoice', cb: 34 },
            { v: 'weightTicket', label: 'Weight ticket', cb: 35 },
            { v: 'supplementary', label: 'Supplementary documents for quality/quantity', cb: 36 },
            { v: 'other', label: 'Other documents if any', cb: 37 },
          ],
        },
        { t: 'text', k: 'othersSpecify', label: 'Others if any – specify and attach', cell: 'T2.R63.C0@2', lines: 2 },
      ],
    },
    {
      title: 'CONCLUSION OF INSPECTION',
      fields: [
        {
          t: 'radio', k: 'conclusion', label: 'Result',
          opts: [
            { v: 'sat', label: 'Satisfactory', cb: 38 },
            { v: 'cond', label: 'Conditional', cb: 39 },
            { v: 'reject', label: 'Reject', cb: 40 },
            { v: 'abortive', label: 'Abortive', cb: 41 },
            { v: 'reinspection', label: 'Re-inspection', cb: 42 },
          ],
        },
        { t: 'text', k: 'conclusionReason', label: 'If not satisfactory, specify the reasons', cell: 'T2.R67.C0@1', lines: 3 },
      ],
    },
    {
      title: 'Applicant’s person(s) in charge',
      fields: [
        { t: 'text', k: 'appCompany', label: 'Company name', cell: 'T3.R0.C1' },
        { t: 'text', k: 'appName', label: 'Name', cell: 'T3.R1.C1' },
        { t: 'text', k: 'appTitle', label: 'Title', cell: 'T3.R2.C1' },
        { t: 'text', k: 'appContact', label: 'Contact points (Tel., email, etc.)', cell: 'T3.R3.C1' },
        { t: 'sign', k: 'appSign', label: 'Signature', cell: 'T3.R4.C1' },
        { t: 'text', k: 'appDate', label: 'Date', cell: 'T3.R5.C1', date: true },
      ],
    },
    {
      title: 'INSPECTOR',
      fields: [
        { t: 'text', k: 'insCompany', label: 'Company name or CERINS branch office name', cell: 'T3.R9.C1' },
        { t: 'text', k: 'insName', label: 'Name', cell: 'T3.R10.C1' },
        { t: 'text', k: 'insTitle', label: 'Title', cell: 'T3.R11.C1' },
        { t: 'sign', k: 'insSign', label: 'Signature', cell: 'T3.R12.C1' },
        { t: 'text', k: 'insDate', label: 'Date', cell: 'T3.R13.C1', date: true },
      ],
    },
  ],
};

// ─────────────────────────────────────────────── PSIC (RE-KR-INS-IN-009)
const PSIC: ReportDef = {
  id: 'psic',
  label: 'PSIC',
  title: 'Pre-Shipment Inspection Report',
  photoTable: 'T3',
  sections: [
    {
      title: 'General Information',
      fields: [
        { t: 'text', k: 'itemNo', label: 'ITEM NO', cell: 'T0.R0.C1' },
        { t: 'text', k: 'reportNo', label: 'REPORT NO.', cell: 'T0.R0.C3', replace: true, ph: 'K-YYYY-MM-DD' },
        { t: 'text', k: 'description', label: 'Description', cell: 'T0.R1.C1' },
        { t: 'text', k: 'brand', label: 'BRAND', cell: 'T0.R1.C3' },
        { t: 'text', k: 'subcontractor', label: 'Subcontractor', cell: 'T0.R2.C1' },
        { t: 'text', k: 'factoryNo', label: 'Factory No', cell: 'T0.R2.C3' },
        { t: 'text', k: 'inspectionDate', label: 'INSPECTION DATE', cell: 'T0.R2.C5', date: true },
        { t: 'text', k: 'piPoNo', label: 'PI# & PO No.', cell: 'T0.R3.C1' },
        { t: 'text', k: 'lotSize', label: 'Lot Size', cell: 'T0.R3.C3' },
        { t: 'text', k: 'barCodeNo', label: 'BAR CODE NO.', cell: 'T0.R3.C5' },
      ],
    },
    {
      title: 'II. Inspection Result',
      fields: [
        {
          t: 'radio', k: 'result', label: 'INSPECTION RESULT',
          opts: [
            { v: 'passed', label: 'PASSED', cell: 'T2.R0.C2' },
            { v: 'failed', label: 'FAILED', cell: 'T2.R0.C4' },
            { v: 'pending', label: 'PENDING', cell: 'T2.R0.C6' },
          ],
        },
        { t: 'text', k: 'remarks', label: 'Remarks', cell: 'T2.R1.C1', lines: 4 },
        { t: 'text', k: 'inspector', label: 'Inspector', cell: 'T2.R2.C1' },
        { t: 'text', k: 'subcontractorBy', label: 'Subcontractor By', cell: 'T2.R2.C3', replace: true, ph: 'N/A' },
        { t: 'text', k: 'reviewed', label: 'Reviewed', cell: 'T2.R3.C1' },
      ],
    },
  ],
};

export const REPORTS: ReportDef[] = [CEC, SCRAP, PSIC];

/** 물품 묶음 gi 를 지우고 뒤 묶음 번호를 한 칸씩 당긴 새 맵을 만든다.
 *  `${tab}.…#${gi}` 형태의 키만 건드리고 나머지는 그대로 둔다. */
export function dropGroup<T>(map: Record<string, T>, tab: string, gi: number): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(map)) {
    const m = k.match(/^(.*#)(\d+)$/);
    if (!m || !k.startsWith(`${tab}.`)) {
      out[k] = v;
      continue;
    }
    const g = Number(m[2]);
    if (g === gi) continue;
    out[g > gi ? `${m[1]}${g - 1}` : k] = v;
  }
  return out;
}

export interface PhotoEntry {
  /** catPhotos / catLabels 의 키 */
  key: string;
  label: string;
  /** photoCategories 안의 위치 */
  ci: number;
  /** 물품 묶음 번호(0-based). 묶음이 아니면 -1 */
  gi: number;
}

/** photoGroup 구간을 groups 개만큼 반복해 펼친 사진 항목 목록.
 *  배열 순서가 곧 화면 순서이자 Word 캡션의 번호 순서다. */
export function expandPhotoEntries(def: ReportDef, groups: number): PhotoEntry[] {
  const cats = def.photoCategories ?? [];
  const grp = def.photoGroup;
  const n = Math.max(1, groups);
  return cats.flatMap((c, i) => {
    if (!grp || i < grp.from || i > grp.to) return [{ key: `${i}`, label: c, ci: i, gi: -1 }];
    if (i > grp.from) return []; // 묶음은 시작 위치에서 한 번에 펼친다
    return Array.from({ length: n }, (_x, gi) =>
      cats.slice(grp.from, grp.to + 1).map((gc, j) => ({
        key: `${grp.from + j}#${gi}`,
        label: gc,
        ci: grp.from + j,
        gi,
      }))
    ).flat();
  });
}

export function getReport(id: string): ReportDef | undefined {
  return REPORTS.find(r => r.id === id);
}

export type FormValues = Record<string, string | string[] | string[][]>;

/** 마지막으로 값이 채워진 행 수(뒤쪽 빈 행은 버린다). 아무것도 없으면 0. */
export function filledRows(grid: unknown): number {
  if (!Array.isArray(grid)) return 0;
  let n = 0;
  (grid as string[][]).forEach((row, r) => {
    if (Array.isArray(row) && row.some(c => (c ?? '').trim() !== '')) n = r + 1;
  });
  return n;
}

/** 숫자만 입력했으면 단위를 붙인다. ('20000' → '20000 (KG)') */
function withUnit(value: string, unit?: string): string {
  if (!unit) return value;
  return /^[0-9.,]+$/.test(value.trim()) ? `${value.trim()} (${unit})` : value;
}

/** 행 수가 바뀐 표에서, 그 블록 뒤에 있는 셀 좌표의 행 번호를 밀어준다. */
function shiftCell(cell: string, blocks: RowBlock[]): string {
  return cell.replace(/^T(\d+)\.R(\d+)\./, (m, t, r) => {
    const b = blocks.find(x => x.table === Number(t) && Number(r) > x.to);
    if (!b) return m;
    return `T${t}.R${Number(r) + b.count - (b.to - b.from + 1)}.`;
  });
}

export interface RowBlock { table: number; from: number; to: number; count: number }

/** 폼 입력값을 템플릿 채우기 지시(셀 쓰기 + 체크박스 인덱스)로 변환한다. */
export function resolveWrites(def: ReportDef, values: FormValues) {
  const writes: { cell: string; value: string; replace?: boolean; prefix?: string }[] = [];
  const checks: number[] = [];
  /** 서명 그림. cell 은 아래에서 writes 와 같이 행 이동을 반영한다. */
  const signs: { cell: string; dataUrl: string }[] = [];
  const rowBlocks: RowBlock[] = [];
  // 행 수가 바뀌는 표는 먼저 개수를 정해야 뒤쪽 셀 좌표를 밀 수 있다.
  for (const section of def.sections) {
    for (const f of section.fields) {
      if (f.t === 'grid' && f.rowBlock) {
        // 아무것도 입력하지 않았으면 템플릿을 건드리지 않는다.
        const count = filledRows(values[f.k]);
        if (count > 0) rowBlocks.push({ ...f.rowBlock, count });
      }
    }
  }
  // 행이 늘어난 표 안의 셀은 밀면 안 되므로 따로 모아 마지막에 합친다.
  const blockWrites: typeof writes = [];

  for (const section of def.sections) {
    for (const f of section.fields) {
      const v = values[f.k];
      if (f.t === 'text') {
        if (typeof v !== 'string' || v === '') continue;
        writes.push({ cell: f.cell, value: v, replace: f.replace, prefix: f.prefix });
      } else if (f.t === 'sign') {
        if (typeof v !== 'string' || !v.startsWith('data:image/png;base64,')) continue;
        signs.push({ cell: f.cell, dataUrl: v });
      } else if (f.t === 'radio') {
        const opt = f.opts.find(o => o.v === v);
        if (!opt) continue;
        if (opt.cb !== undefined) checks.push(opt.cb);
        if (opt.cell) writes.push({ cell: opt.cell, value: opt.value ?? 'X' });
      } else if (f.t === 'checks') {
        if (!Array.isArray(v)) continue;
        for (const opt of f.opts) if ((v as string[]).includes(opt.v)) checks.push(opt.cb);
      } else {
        if (!Array.isArray(v)) continue;
        const rows = f.rowBlock ? filledRows(v) : f.rows.length;
        (v as string[][]).slice(0, rows).forEach((row, r) => {
          // 행을 늘린 표는 좌표를 첫 행 패턴에서 만들어낸다(템플릿 행 수를 넘어도 된다).
          const cells = f.rowBlock
            ? f.rows[0].map(c => c.replace(/\.R\d+\./, `.R${f.rowBlock!.from + r}.`))
            : f.rows[r];
          if (!cells || !Array.isArray(row)) return;
          row.forEach((cellValue, c) => {
            if (!cells[c] || !cellValue) return;
            const w = { cell: cells[c], value: withUnit(cellValue, f.unitCols?.[c]) };
            (f.rowBlock ? blockWrites : writes).push(w);
          });
        });
      }
    }
  }
  for (const w of writes) w.cell = shiftCell(w.cell, rowBlocks);
  for (const s of signs) s.cell = shiftCell(s.cell, rowBlocks);
  return { writes: [...writes, ...blockWrites], checks, rowBlocks, signs };
}
