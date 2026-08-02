"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface GradePoint {
  label: string;
  percent: number;
}

export function GradeTrendChart({ data }: { data: GradePoint[] }) {
  if (data.length < 2) return null;

  return (
    <div className="h-56 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <XAxis dataKey="label" fontSize={11} tickLine={false} />
          <YAxis domain={[0, 100]} fontSize={11} tickLine={false} width={30} />
          <Tooltip
            formatter={(value) => [`${value}%`, "النسبة"]}
            contentStyle={{ direction: "rtl" }}
          />
          <Line
            type="monotone"
            dataKey="percent"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
