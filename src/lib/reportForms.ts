/**
 * 검사 보고서 3종(CEC / SCRAP / PSIC)의 입력 폼 정의.
 * 화면 렌더링(app/photo-report/page.tsx)과 Word 채우기(app/api/photo-report/route.ts)가
 * 이 한 파일을 공유한다. cell/cb 값은 원본 템플릿을 파싱해 얻은 좌표다.
 *   cell: 'T{표}.R{행}.C{열}[@문단]'   cb: 문서 내 ☐ 등장 순서(0-based)
 */

export type Field =
  | { t: 'text'; k: string; label: string; cell: string; lines?: number; replace?: boolean; prefix?: string; ph?: string }
  | { t: 'radio'; k: string; label: string; opts: { v: string; label: string; cb?: number; cell?: string }[] }
  | { t: 'checks'; k: string; label: string; opts: { v: string; label: string; cb: number }[] }
  | { t: 'grid'; k: string; label: string; cols: string[]; rows: string[][] };

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
  sections: Section[];
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
  sections: [
    {
      title: 'General Information',
      fields: [
        { t: 'text', k: 'jobFileNo', label: 'Job File No', cell: 'T0.R0.C1' },
        { t: 'text', k: 'date', label: 'Date', cell: 'T0.R0.C2', prefix: ' ' },
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
        { t: 'text', k: 'inspDate', label: 'Date of Inspection (dd-mm-yyyy)', cell: 'T2.R1.C0' },
        { t: 'text', k: 'opTestMark', label: 'Operation Test', cell: 'T2.R1.C1', ph: '✔ / N/A' },
        { t: 'text', k: 'packingMark', label: 'Packing', cell: 'T2.R1.C2', ph: '✔ / N/A' },
        { t: 'text', k: 'loadingMark', label: 'Loading Supervision', cell: 'T2.R1.C3', ph: '✔ / N/A' },
        { t: 'text', k: 'place', label: 'Place of Inspection and Country (full address)', cell: 'T2.R2.C1', lines: 3 },
        { t: 'text', k: 'roundTrip', label: 'Round-Trip Travel Time (00:00 h)', cell: 'T2.R4.C1' },
        { t: 'text', k: 'totalDuration', label: 'Total Duration of Inspection Hours (00:00 h)', cell: 'T2.R4.C2' },
        {
          t: 'grid',
          k: 'times',
          label: 'Time of Operation Test / Packing Inspection / Loading Supervision',
          cols: [
            'OT Date (XX-XX)', 'OT From', 'OT To',
            'Pack Date (XX-XX)', 'Pack From', 'Pack To',
            'Load Date (XX-XX)', 'Load From', 'Load To',
          ],
          rows: gridRows(2, 7, 10, 1, 9),
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
        { t: 'text', k: 'appDate', label: 'Date', cell: 'T11.R5.C1' },
      ],
    },
    {
      title: 'INSPECTOR',
      fields: [
        { t: 'text', k: 'insCompany', label: 'Company name or CERINS branch office name', cell: 'T11.R9.C1' },
        { t: 'text', k: 'insName', label: 'Name', cell: 'T11.R10.C1' },
        { t: 'text', k: 'insTitle', label: 'Title', cell: 'T11.R11.C1' },
        { t: 'text', k: 'insDate', label: 'Date', cell: 'T11.R13.C1' },
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
  sections: [
    {
      title: 'General Information',
      fields: [
        { t: 'text', k: 'jobFileNo', label: 'Job File No.', cell: 'T0.R0.C0', replace: true, prefix: 'Job File No. ', ph: 'CERINS-XXXXXX/KR' },
        { t: 'text', k: 'date', label: 'Date', cell: 'T0.R0.C2', replace: true, ph: 'MMMM DD, YYYY' },
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
        { t: 'text', k: 'inspDate', label: 'Date of inspection (dd-mm-yyyy)', cell: 'T2.R0.C1' },
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
        { t: 'text', k: 'calLast', label: 'Last date of calibration', cell: 'T2.R16.C1' },
        { t: 'text', k: 'calNext', label: 'Next date of calibration', cell: 'T2.R17.C1' },
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
        { t: 'text', k: 'appDate', label: 'Date', cell: 'T3.R5.C1' },
      ],
    },
    {
      title: 'INSPECTOR',
      fields: [
        { t: 'text', k: 'insCompany', label: 'Company name or CERINS branch office name', cell: 'T3.R9.C1' },
        { t: 'text', k: 'insName', label: 'Name', cell: 'T3.R10.C1' },
        { t: 'text', k: 'insTitle', label: 'Title', cell: 'T3.R11.C1' },
        { t: 'text', k: 'insDate', label: 'Date', cell: 'T3.R13.C1' },
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
        { t: 'text', k: 'inspectionDate', label: 'INSPECTION DATE', cell: 'T0.R2.C5' },
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

export function getReport(id: string): ReportDef | undefined {
  return REPORTS.find(r => r.id === id);
}

export type FormValues = Record<string, string | string[] | string[][]>;

/** 폼 입력값을 템플릿 채우기 지시(셀 쓰기 + 체크박스 인덱스)로 변환한다. */
export function resolveWrites(def: ReportDef, values: FormValues) {
  const writes: { cell: string; value: string; replace?: boolean; prefix?: string }[] = [];
  const checks: number[] = [];

  for (const section of def.sections) {
    for (const f of section.fields) {
      const v = values[f.k];
      if (f.t === 'text') {
        if (typeof v !== 'string' || v === '') continue;
        writes.push({ cell: f.cell, value: v, replace: f.replace, prefix: f.prefix });
      } else if (f.t === 'radio') {
        const opt = f.opts.find(o => o.v === v);
        if (!opt) continue;
        if (opt.cb !== undefined) checks.push(opt.cb);
        if (opt.cell) writes.push({ cell: opt.cell, value: 'X' });
      } else if (f.t === 'checks') {
        if (!Array.isArray(v)) continue;
        for (const opt of f.opts) if ((v as string[]).includes(opt.v)) checks.push(opt.cb);
      } else {
        if (!Array.isArray(v)) continue;
        (v as string[][]).forEach((row, r) => {
          const cells = f.rows[r];
          if (!cells || !Array.isArray(row)) return;
          row.forEach((cellValue, c) => {
            if (cells[c] && cellValue) writes.push({ cell: cells[c], value: cellValue });
          });
        });
      }
    }
  }
  return { writes, checks };
}
