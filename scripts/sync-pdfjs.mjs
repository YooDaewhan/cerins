// pdfjs-dist 런타임 자산(worker/cmaps/폰트/wasm)을 public/pdfjs 로 복사.
// 워커와 API 버전이 어긋나면 뷰어가 통째로 죽으므로 설치 때마다 맞춘다.
import { cpSync } from "node:fs";

for (const d of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  cpSync(`node_modules/pdfjs-dist/${d}`, `public/pdfjs/${d}`, { recursive: true });
}
cpSync("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "public/pdfjs/pdf.worker.min.mjs");
