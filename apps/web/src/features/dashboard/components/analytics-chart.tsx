import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const data = [
  {
    clicks: Math.floor(Math.random() * 900) + 100,
    name: "Mon",
    uniques: Math.floor(Math.random() * 700) + 80,
  },
  {
    clicks: Math.floor(Math.random() * 900) + 100,
    name: "Tue",
    uniques: Math.floor(Math.random() * 700) + 80,
  },
  {
    clicks: Math.floor(Math.random() * 900) + 100,
    name: "Wed",
    uniques: Math.floor(Math.random() * 700) + 80,
  },
  {
    clicks: Math.floor(Math.random() * 900) + 100,
    name: "Thu",
    uniques: Math.floor(Math.random() * 700) + 80,
  },
  {
    clicks: Math.floor(Math.random() * 900) + 100,
    name: "Fri",
    uniques: Math.floor(Math.random() * 700) + 80,
  },
  {
    clicks: Math.floor(Math.random() * 900) + 100,
    name: "Sat",
    uniques: Math.floor(Math.random() * 700) + 80,
  },
  {
    clicks: Math.floor(Math.random() * 900) + 100,
    name: "Sun",
    uniques: Math.floor(Math.random() * 700) + 80,
  },
];

export function AnalyticsChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke="currentColor"
          className="text-primary"
          fill="currentColor"
          fillOpacity={0.15}
        />
        <Area
          type="monotone"
          dataKey="uniques"
          stroke="currentColor"
          className="text-muted-foreground"
          fill="currentColor"
          fillOpacity={0.1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
