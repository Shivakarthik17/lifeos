"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/dashboard";

export default function LifeScoreTrend({ data }: { data: TrendPoint[] }) {
  const hasData = data.some((d) => d.score !== null);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        Not enough data yet — your trend appears as you log each day.
      </div>
    );
  }

  return (
    <div className="mt-4 h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#1F2A52" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#9AA3C7"
            tick={{ fill: "#9AA3C7", fontSize: 11 }}
            axisLine={{ stroke: "#1F2A52" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#9AA3C7"
            tick={{ fill: "#9AA3C7", fontSize: 11 }}
            axisLine={{ stroke: "#1F2A52" }}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "#0E1430",
              border: "1px solid #1F2A52",
              borderRadius: 8,
              color: "#fff",
            }}
            formatter={(v) => [`${v}`, "Life Score"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            name="Life Score"
            stroke="#7F77DD"
            strokeWidth={2}
            dot={{ r: 3, fill: "#7F77DD" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
