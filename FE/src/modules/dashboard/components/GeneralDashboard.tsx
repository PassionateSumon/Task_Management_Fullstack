import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { getDashboardDataOfActualUser } from "../slices/dashboardSlice";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { DotLoader } from "react-spinners";

const PRIORITY_COLORS = ["#E53E3E", "#ED8936", "#48BB78", "#A0AEC0"];

const StatCard = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) => (
  <div
    className="bg-white rounded-xl shadow-sm p-4 border-l-4 flex flex-col gap-1"
    style={{ borderLeftColor: accent }}
  >
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {label}
    </p>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
  </div>
);

const SectionCard = ({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-white rounded-xl shadow-sm p-4 flex flex-col ${className}`}>
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      {title}
    </h2>
    <div className="flex-1 flex flex-col justify-center">{children}</div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
      <svg
        className="w-5 h-5 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
    <p className="text-xs text-gray-400 text-center">{message}</p>
  </div>
);

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-sm">
        <p className="font-semibold text-gray-700">{label}</p>
        <p className="text-[#5A67D8]">Count: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const GeneralDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    dispatch(getDashboardDataOfActualUser()).then((res: any) => {
      setData(res.payload);
    });
  }, [dispatch]);

  if (!data)
    return (
      <DotLoader
        cssOverride={{ position: "fixed", top: "50%", left: "50%" }}
        speedMultiplier={1}
      />
    );

  const priorityPieData = [
    { name: "High", value: data?.tasksByPriority?.high ?? 0 },
    { name: "Medium", value: data?.tasksByPriority?.medium ?? 0 },
    { name: "Low", value: data?.tasksByPriority?.low ?? 0 },
    { name: "No Priority", value: data?.tasksByPriority?.null ?? 0 },
  ].filter((d) => d.value > 0);

  const statusData = (data.tasksByStatus ?? []).filter((s: any) => s.count > 0);
  const completionPct =
    data.completionRate != null ? `${data.completionRate}%` : "N/A";

  return (
    <div className="bg-[#F3F4FE] h-[94vh] overflow-y-auto thin-scrollbar p-5 text-[#2D3748] flex flex-col gap-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-800">Personal Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Tasks" value={data.totalTasks} accent="#5A67D8" />
        <StatCard label="Completed" value={data.completedTasks} accent="#48BB78" />
        <StatCard label="Overdue" value={data.overdueTasks} accent="#E53E3E" />
        <StatCard label="Pending" value={data.pendingTasks} accent="#ED8936" />
        <StatCard label="Completion Rate" value={completionPct} accent="#38B2AC" />
      </div>

      {/* Charts — flex-1 so they stretch to fill remaining space */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        <SectionCard title="Tasks by Priority" className="min-h-[260px]">
          {priorityPieData.length === 0 ? (
            <EmptyState message="No tasks yet — add your first task to see priority breakdown" />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  dataKey="value"
                  data={priorityPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ name, percent }) =>
                    percent > 0
                      ? `${name} ${(percent * 100).toFixed(0)}%`
                      : ""
                  }
                  labelLine={false}
                >
                  {priorityPieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Tasks by Status" className="min-h-[260px]">
          {statusData.length === 0 ? (
            <EmptyState message="No completed or active tasks to show yet" />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={data.tasksByStatus}
                barSize={36}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F0F0F0"
                  vertical={false}
                />
                <XAxis
                  dataKey="statusName"
                  tick={{ fontSize: 11, fill: "#718096" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#718096" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomBarTooltip />}
                  cursor={{ fill: "#EEF2FF" }}
                />
                <Bar dataKey="count" fill="#5A67D8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Summary footer strip */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-3 flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#5A67D8] inline-block" />
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{data.totalTasks}</span>{" "}
            total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#48BB78] inline-block" />
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{data.completedTasks}</span>{" "}
            completed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E53E3E] inline-block" />
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{data.overdueTasks}</span>{" "}
            overdue
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ED8936] inline-block" />
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{data.pendingTasks}</span>{" "}
            pending
          </span>
        </div>
        <div className="ml-auto text-xs text-gray-400">
          Completion rate:{" "}
          <span className="font-bold text-[#38B2AC] text-sm">{completionPct}</span>
        </div>
      </div>
    </div>
  );
};

export default GeneralDashboard;