import mysql from "mysql2/promise";

declare global {
  // 개발 모드 HMR 시 풀이 중복 생성되지 않도록 전역 캐시.
  // eslint-disable-next-line no-var
  var __cerinsPool: mysql.Pool | undefined;
}

export function getPool(): mysql.Pool {
  if (!global.__cerinsPool) {
    global.__cerinsPool = mysql.createPool({
      host: process.env.DB_HOST ?? "127.0.0.1",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "cerins",
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4",
      dateStrings: true,
    });
  }
  return global.__cerinsPool;
}
