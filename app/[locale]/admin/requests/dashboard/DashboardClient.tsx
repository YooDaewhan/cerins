"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  statusLabel,
  type ServiceType,
  type RequestStatus,
} from "@/src/lib/serviceRequestTypes";
import type {
  DashboardData,
  DashboardPreset,
  CountSlice,
} from "@/src/lib/requestDashboard";

/* ------------------------------ 유틸 ------------------------------ */

// 서버(requestDashboard.ts)와 동일 라벨. 클라이언트 번들이 DB 모듈을 끌어오지
// 않도록 값은 여기서 정의하고 requestDashboard 는 타입만 import 한다.
const PRESET_LABELS: Record<DashboardPreset, string> = {
  month: "최근 1개월",
  "6month": "최근 6개월",
  year: "최근 1년",
  all: "전체",
  custom: "기간 지정",
};

const PRESETS: DashboardPreset[] = ["month", "6month", "year", "all", "custom"];

// 도넛/막대 색상 팔레트.
const PALETTE = [
  "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
  "#0d9488", "#9333ea",
];

function wonFmt(v: number): string {
  return `₩${Math.round(v).toLocaleString("ko-KR")}`;
}
function wonShort(v: number): string {
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${Math.round(v / 10000).toLocaleString("ko-KR")}만`;
  return v.toLocaleString("ko-KR");
}

function statusSliceLabel(s: CountSlice): string {
  return STATUS_LABELS[s.key as RequestStatus] ?? statusLabel(s.key);
}
function serviceSliceLabel(s: CountSlice): string {
  return SERVICE_TYPE_LABELS[s.key as ServiceType] ?? s.key;
}

interface StaffCandidate {
  id: number;
  login_id: string;
  email: string;
}

/* ------------------------------ 메인 ------------------------------ */

export default function DashboardClient() {
  const [preset, setPreset] = useState<DashboardPreset>("6month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [assignee, setAssignee] = useState("");
  const [staffList, setStaffList] = useState<StaffCandidate[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 담당자 후보 로드(필터용).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/requests/staff-candidates", { cache: "no-store" });
        const d = await res.json();
        if (res.ok) setStaffList((d.staff ?? []) as StaffCandidate[]);
      } catch {
        /* 무시: 필터 없이도 동작 */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      sp.set("preset", preset);
      if (preset === "custom") {
        if (from) sp.set("from", from);
        if (to) sp.set("to", to);
      }
      if (assignee) sp.set("assignee", assignee);
      const res = await fetch(`/api/admin/requests/dashboard?${sp.toString()}`, {
        cache: "no-store",
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "불러오기 실패");
        return;
      }
      setData(d as DashboardData);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [preset, from, to, assignee]);

  // custom 은 날짜를 다 입력해야 조회. 나머지는 즉시 조회.
  useEffect(() => {
    if (preset === "custom" && (!from || !to)) return;
    void load();
  }, [load, preset, from, to]);

  return (
    <div className="space-y-5">
      {/* 필터 바 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                preset === p
                  ? "bg-(--brand) text-white border-(--brand)"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {preset === "custom" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-gray-500">시작일</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-gray-500">종료일</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-gray-500">담당자</span>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm bg-white min-w-[140px]"
            >
              <option value="">전체 담당자</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.login_id}
                </option>
              ))}
            </select>
          </label>
          {data && (
            <p className="text-xs text-gray-400 ml-auto">
              {data.range.from ? data.range.from.slice(0, 10) : "전체"} ~{" "}
              {data.range.to ? data.range.to.slice(0, 10) : "현재"}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중...</p>
      ) : preset === "custom" && (!from || !to) ? (
        <p className="text-sm text-gray-400">시작일과 종료일을 선택하세요.</p>
      ) : !data ? (
        <p className="text-sm text-gray-400">데이터가 없습니다.</p>
      ) : (
        <>
          <KpiRow data={data} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="진행도별 분포" hint="선택 기간 접수 건 기준">
              <DonutChart
                slices={data.byStatus.map((s, i) => ({
                  label: statusSliceLabel(s),
                  value: s.count,
                  color: PALETTE[i % PALETTE.length],
                }))}
              />
            </Card>
            <Card title="서비스별 분포" hint="선택 기간 접수 건 기준">
              <DonutChart
                slices={data.byService.map((s, i) => ({
                  label: serviceSliceLabel(s),
                  value: s.count,
                  color: PALETTE[(i + 3) % PALETTE.length],
                }))}
              />
            </Card>
          </div>

          <Card
            title="기간별 추이"
            hint={data.range.bucket === "month" ? "월별 접수 / 견적액" : "일별 접수 / 견적액"}
          >
            <TrendChart data={data} />
          </Card>

          <Card title="담당자별 실적" hint="선택 기간 접수 건 기준">
            <StaffTable data={data} />
          </Card>
        </>
      )}
    </div>
  );
}

/* ------------------------------ KPI ------------------------------ */

function KpiRow({ data }: { data: DashboardData }) {
  const s = data.summary;
  const cards = [
    { label: "기간 내 접수", value: `${s.total.toLocaleString("ko-KR")}건`, sub: `전체 ${s.totalAllTime.toLocaleString("ko-KR")}건`, tone: "text-(--brand)" },
    { label: "진행 중", value: `${s.inProgress.toLocaleString("ko-KR")}건`, sub: `반려 ${s.rejected}건`, tone: "text-amber-600" },
    { label: "완료", value: `${s.completed.toLocaleString("ko-KR")}건`, sub: s.total ? `완료율 ${Math.round((s.completed / s.total) * 100)}%` : "-", tone: "text-green-600" },
    { label: "견적 총액", value: wonFmt(s.revenue), sub: `완료 ${wonShort(s.revenueCompleted)}`, tone: "text-indigo-600" },
    { label: "평균 견적액", value: wonFmt(s.avgAmount), sub: `견적 ${s.quotedCount}건`, tone: "text-gray-700" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">{c.label}</p>
          <p className={`mt-1 text-xl font-bold ${c.tone} break-all`}>{c.value}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ 카드 ------------------------------ */

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ---------------------------- 도넛 차트 ---------------------------- */

interface Slice {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const size = 160;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  if (total === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">데이터가 없습니다.</p>;
  }

  let offset = 0;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = s.value / total;
      const seg = { ...s, dash: frac * c, offset: offset * c, frac };
      offset += frac;
      return seg;
    });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        role="img"
        aria-label="도넛 차트"
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeDasharray={`${a.dash} ${c - a.dash}`}
              strokeDashoffset={-a.offset}
            />
          ))}
        </g>
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-gray-800"
          style={{ fontSize: 22, fontWeight: 700 }}
        >
          {total.toLocaleString("ko-KR")}
        </text>
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          className="fill-gray-400"
          style={{ fontSize: 11 }}
        >
          건
        </text>
      </svg>
      <ul className="flex-1 w-full space-y-1.5 text-sm">
        {arcs.map((a) => (
          <li key={a.label} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: a.color }}
            />
            <span className="text-gray-700 flex-1 truncate">{a.label}</span>
            <span className="text-gray-500 tabular-nums">{a.value}</span>
            <span className="text-gray-400 text-xs tabular-nums w-10 text-right">
              {Math.round(a.frac * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------- 막대 차트 ---------------------------- */

function TrendChart({ data }: { data: DashboardData }) {
  const [mode, setMode] = useState<"count" | "revenue">("count");
  const points = data.trend;

  if (points.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">데이터가 없습니다.</p>;
  }

  const values = points.map((p) => (mode === "count" ? p.count : p.revenue));
  const max = Math.max(1, ...values);
  const barW = 34;
  const gap = 12;
  const chartH = 180;
  const width = points.length * (barW + gap) + gap;

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <ToggleBtn active={mode === "count"} onClick={() => setMode("count")}>
          접수 건수
        </ToggleBtn>
        <ToggleBtn active={mode === "revenue"} onClick={() => setMode("revenue")}>
          견적액
        </ToggleBtn>
      </div>
      <div className="overflow-x-auto">
        <svg width={Math.max(width, 300)} height={chartH + 40} role="img" aria-label="추이 막대 그래프">
          {[0.25, 0.5, 0.75, 1].map((g) => (
            <line
              key={g}
              x1={0}
              x2={Math.max(width, 300)}
              y1={chartH - chartH * g}
              y2={chartH - chartH * g}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
          ))}
          {points.map((p, i) => {
            const v = mode === "count" ? p.count : p.revenue;
            const h = (v / max) * (chartH - 10);
            const x = gap + i * (barW + gap);
            const y = chartH - h;
            return (
              <g key={p.bucket}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={4}
                  fill={mode === "count" ? "#2563eb" : "#4f46e5"}
                >
                  <title>
                    {p.bucket} · {mode === "count" ? `${p.count}건` : wonFmt(p.revenue)}
                  </title>
                </rect>
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="fill-gray-600"
                  style={{ fontSize: 10, fontWeight: 600 }}
                >
                  {v > 0 ? (mode === "count" ? v : wonShort(v)) : ""}
                </text>
                <text
                  x={x + barW / 2}
                  y={chartH + 16}
                  textAnchor="middle"
                  className="fill-gray-400"
                  style={{ fontSize: 9 }}
                >
                  {data.range.bucket === "month" ? p.bucket.slice(2) : p.bucket.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs font-medium border ${
        active
          ? "bg-(--brand) text-white border-(--brand)"
          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

/* --------------------------- 담당자 실적 --------------------------- */

function StaffTable({ data }: { data: DashboardData }) {
  const rows = data.staff;
  const maxHandled = Math.max(1, ...rows.map((r) => r.handled));

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">배정된 의뢰가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            <th className="px-3 py-2">담당자</th>
            <th className="px-3 py-2">처리 건수</th>
            <th className="px-3 py-2">진행 중</th>
            <th className="px-3 py-2">완료</th>
            <th className="px-3 py-2 text-right">견적 총액</th>
            <th className="px-3 py-2 text-right">완료 매출</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.assignee_user_id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-[60px] max-w-[140px] h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-(--brand) rounded-full"
                      style={{ width: `${(r.handled / maxHandled) * 100}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-gray-700 w-8">{r.handled}</span>
                </div>
              </td>
              <td className="px-3 py-2 tabular-nums text-amber-600">{r.inProgress}</td>
              <td className="px-3 py-2 tabular-nums text-green-600">{r.completed}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-700">{wonFmt(r.revenue)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-indigo-600">{wonFmt(r.revenueCompleted)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
