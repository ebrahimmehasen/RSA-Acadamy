"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BarPoint {
  label: string;
  value: number;
}

export function SimpleBarChart({
  data,
  color = "var(--primary)",
  valueSuffix = "",
}: {
  data: BarPoint[];
  color?: string;
  valueSuffix?: string;
}) {
  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="label" fontSize={11} tickLine={false} />
          <YAxis fontSize={11} tickLine={false} width={40} />
          <Tooltip
            formatter={(value) => [`${value}${valueSuffix}`, ""]}
            contentStyle={{ direction: "rtl" }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
