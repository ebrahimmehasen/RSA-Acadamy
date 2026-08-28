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
  if (data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-center text-sm text-muted-foreground">
        لا توجد بيانات كافية لعرض الرسم البياني
      </div>
    );
  }

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
