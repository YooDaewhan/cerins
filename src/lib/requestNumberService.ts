// 접수번호 생성 서비스. 코드 여러 곳에서 문자열을 직접 만들지 말고 이 서비스를 사용한다.
// 동시 요청에도 중복되지 않도록 request_number_seq (year_2, prefix) 행을 원자적으로 증가시키고,
// service_requests.request_number 의 UNIQUE index 가 최종 방어선이다.
//
// 번호 구간 예약(명세 §3):
//   TRCU/GOST 인증 : cert-YY-0001 ~ 0999   (serviceRequestRepo.nextRequestNumber, prefix 'cert')
//   CEC India      : cert-YY-1000 ~ 1999   (이 파일, 별도 prefix 'cec' 시퀀스, 1000 부터 시작)
//
// 연간 처리 건수가 예약 범위를 넘을 수 있으므로 형식 변경(cert-cec-YY-0001)이 쉽도록
// 포맷 로직을 이 함수 한 곳에 모아둔다.

import type { PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";

type Executor = Pick<PoolConnection, "query" | "execute">;

// CEC 는 매년 1000 부터 시작. 첫 발급 시 시퀀스 행을 1000 으로 생성, 이후 +1.
export const CEC_SEQ_START = 1000;
const CEC_SEQ_PREFIX = "cec"; // request_number_seq 내부 구분 키(출력 문자열과 무관)

// 트랜잭션 내부에서 호출한다. 반환: 'cert-26-1000' 형식.
export async function nextCecRequestNumber(conn: Executor, year2: number): Promise<string> {
  // 존재하지 않으면 CEC_SEQ_START 로 시작, 있으면 원자적 +1. 같은 행 UPDATE 는 행 잠금으로 직렬화.
  await conn.execute(
    `INSERT INTO request_number_seq (year_2, prefix, last_seq) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE last_seq = last_seq + 1`,
    [year2, CEC_SEQ_PREFIX, CEC_SEQ_START],
  );
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT last_seq FROM request_number_seq WHERE year_2 = ? AND prefix = ?`,
    [year2, CEC_SEQ_PREFIX],
  );
  const seq = Number((rows[0] as { last_seq: number }).last_seq);
  return formatCecNumber(year2, seq);
}

// 접수번호 포맷. 형식 변경이 필요하면 이 함수만 수정한다.
export function formatCecNumber(year2: number, seq: number): string {
  const yy = String(year2).padStart(2, "0");
  return `cert-${yy}-${String(seq).padStart(4, "0")}`;
}

/* ------------------------------------------------------------------ */
/* 스크랩 India 접수번호                                                 */
/* ------------------------------------------------------------------ */

// 스크랩 India 는 제품검사(insp-*)와 구분되는 별도 prefix 'scrap' 시퀀스를 사용한다.
// 형식: scrap-26-0001. 연도별 순번, request_number_seq (year_2, prefix) 원자적 증가로 중복 방지.
const SCRAP_SEQ_PREFIX = "scrap";

// 트랜잭션 내부에서 호출한다. 반환: 'scrap-26-0001' 형식.
export async function nextScrapRequestNumber(conn: Executor, year2: number): Promise<string> {
  await conn.execute(
    `INSERT INTO request_number_seq (year_2, prefix, last_seq) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE last_seq = last_seq + 1`,
    [year2, SCRAP_SEQ_PREFIX],
  );
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT last_seq FROM request_number_seq WHERE year_2 = ? AND prefix = ?`,
    [year2, SCRAP_SEQ_PREFIX],
  );
  const seq = Number((rows[0] as { last_seq: number }).last_seq);
  return formatScrapNumber(year2, seq);
}

export function formatScrapNumber(year2: number, seq: number): string {
  const yy = String(year2).padStart(2, "0");
  return `scrap-${yy}-${String(seq).padStart(4, "0")}`;
}
