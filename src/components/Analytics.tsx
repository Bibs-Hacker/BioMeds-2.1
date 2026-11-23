import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
const colors = [
  "#1677B8",
  "#13A89E",
  "#0D3155",
  "#F3B44D",
  "#8F75BE",
  "#E17B68",
];
export function AnalyticsChart({
  title,
  data,
  kind = "bar",
}: {
  title: string;
  data: { name: string; value: number }[];
  kind?: "bar" | "pie" | "line";
}) {
  return (
    <article className="panel chart-panel">
      <h3>{title}</h3>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          {kind === "pie" ? (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={88}
                label
              >
                {data.map((d, i) => (
                  <Cell key={d.name} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : kind === "line" ? (
            <LineChart data={data} margin={{ bottom: 30, left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-25}
                textAnchor="end"
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                name="Registrations"
                type="monotone"
                dataKey="value"
                stroke="#1677B8"
                strokeWidth={3}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ bottom: 35, left: 0, right: 15 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-30}
                textAnchor="end"
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar
                name="Students"
                dataKey="value"
                fill="#13A89E"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      ) : (
        <p className="empty">No matching database records.</p>
      )}
    </article>
  );
}
