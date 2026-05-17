import { useEffect, useState, type ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { getDashboardData, toggleStatus } from "../slices/dashboardSlice";
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
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { DotLoader } from "react-spinners";

const PRIORITY_COLORS = ["#E53E3E", "#ED8936", "#48BB78", "#A0AEC0"];

const normalizePriority = (p: string | null) => {
  if (!p) return null;
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
};

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
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="bg-white rounded-xl shadow-sm p-4">
    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
      {title}
    </h2>
    {children}
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

const AdminDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { dashboardData, loading } = useSelector(
    (state: RootState) => state.dashboard
  ) as any;
  const [activeTab, setActiveTab] = useState<string>("stats");

  useEffect(() => {
    dispatch(getDashboardData());
  }, [dispatch]);

  const tabClasses = (tab: string) =>
    `py-1.5 px-5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer
     ${
       activeTab === tab
         ? "bg-[#434190] text-white shadow-md"
         : "bg-white text-[#434190] border border-[#5A67D8] hover:bg-[#EEF2FF]"
     }`;

  const handleToggleUserStatus = (userId: number) => {
    dispatch(toggleStatus(userId));
  };

  if (loading || !dashboardData)
    return (
      <DotLoader
        cssOverride={{ position: "fixed", top: "50%", left: "50%" }}
        speedMultiplier={1}
      />
    );

  const priorityPieData = [
    { name: "High", value: dashboardData?.tasksByPriority?.high ?? 0 },
    { name: "Medium", value: dashboardData?.tasksByPriority?.medium ?? 0 },
    { name: "Low", value: dashboardData?.tasksByPriority?.low ?? 0 },
    { name: "No Priority", value: dashboardData?.tasksByPriority?.null ?? 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-[#F3F4FE] min-h-[94vh] overflow-y-auto thin-scrollbar p-5 text-[#2D3748]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button className={tabClasses("stats")} onClick={() => setActiveTab("stats")}>
            Stats
          </button>
          <button className={tabClasses("users")} onClick={() => setActiveTab("users")}>
            Users
          </button>
        </div>
      </div>

      {activeTab === "stats" && (
        <div className="flex flex-col gap-4">
          {/* Stat Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Active Users" value={dashboardData.activeUsers} accent="#5A67D8" />
            <StatCard label="Total Tasks" value={dashboardData.totalTasks} accent="#38B2AC" />
            <StatCard label="Overdue Tasks" value={dashboardData.overdueTasks} accent="#E53E3E" />
            <StatCard
              label="Completion Rate"
              value={
                dashboardData.completionRate != null
                  ? `${dashboardData.completionRate}%`
                  : "-"
              }
              accent="#48BB78"
            />
            <StatCard
              label="Avg Duration"
              value={
                dashboardData.avgTaskDurationDays != null
                  ? `${Math.round(dashboardData.avgTaskDurationDays)}d`
                  : "-"
              }
              accent="#ED8936"
            />
          </div>

          {/* Priority + Status side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Tasks by Priority">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={priorityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
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
            </SectionCard>

            <SectionCard title="Tasks by Status">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={dashboardData.tasksByStatus}
                  barSize={32}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
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
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#EEF2FF" }} />
                  <Bar dataKey="tasksCount" fill="#5A67D8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {/* Recent Tasks Table */}
          <SectionCard title="Recent Tasks">
            {dashboardData?.recentTasks?.length === 0 ? (
              <p className="text-sm text-gray-400">No recent tasks.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Task Name</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned To</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.recentTasks?.map((task: any) => {
                      const priority = normalizePriority(task.priority);
                      return (
                        <tr
                          key={task.id}
                          className="border-b border-gray-50 hover:bg-[#F7F8FF] transition-colors"
                        >
                          <td className="px-3 py-2.5 font-semibold text-gray-800">
                            {task.task_name}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 max-w-[160px] truncate">
                            {task.task_description || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-teal-600 font-medium">
                            {task.user?.name}
                          </td>
                          <td className="px-3 py-2.5 text-gray-400">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-block bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                              {task.status?.name}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                priority === "High"
                                  ? "bg-red-50 text-red-700"
                                  : priority === "Medium"
                                  ? "bg-orange-50 text-orange-700"
                                  : priority === "Low"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-50 text-gray-500"
                              }`}
                            >
                              {priority || "No Priority"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Monthly / Weekly / Yearly */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SectionCard title="Monthly Tasks">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  data={dashboardData.monthlyTasks}
                  barSize={24}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "#718096" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#718096" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#E6FFFA" }} />
                  <Bar dataKey="count" fill="#38B2AC" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Weekly Tasks">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  data={dashboardData.weeklyTasks}
                  barSize={24}
                  barCategoryGap="20%"
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(w) => `Wk ${w}`}
                    tick={{ fontSize: 10, fill: "#718096" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#718096" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const { week, count } = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-sm">
                            <p className="font-semibold text-gray-700">Week {week}</p>
                            <p className="text-[#434190]">Tasks: {count}</p>
                          </div>
                        );
                      }
                    }}
                    cursor={{ fill: "#EEF2FF" }}
                  />
                  <Bar dataKey="count" fill="#434190" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Yearly Tasks">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  data={dashboardData.yearlyTasks}
                  barSize={24}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fill: "#718096" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#718096" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#EEF2FF" }} />
                  <Bar dataKey="count" fill="#5A67D8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {/* Status Trends Line Chart */}
          {dashboardData?.statusTrends?.length > 0 && (
            <SectionCard title="Completion Trend — Last 30 Days">
              <ResponsiveContainer width="100%" height={140}>
                <LineChart
                  data={dashboardData.statusTrends}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#718096" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#718096" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#5A67D8"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#5A67D8" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>
          )}
        </div>
      )}

      {activeTab === "users" && (
        <div className="flex flex-col gap-4">
          <SectionCard title="All Users">
            {dashboardData?.allIsActiveUsers?.length === 0 ? (
              <p className="text-sm text-gray-400">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.allIsActiveUsers?.map((user: any) => (
                      <tr
                        key={user.id}
                        className="border-b border-gray-50 hover:bg-[#F7F8FF] transition-colors"
                      >
                        <td className="px-3 py-2.5 font-semibold text-gray-800">{user.id}</td>
                        <td className="px-3 py-2.5 text-gray-700">{user.name}</td>
                        <td className="px-3 py-2.5 text-teal-600">{user.email}</td>
                        <td className="px-3 py-2.5">
                          {user.isActive ? (
                            <span className="inline-block bg-green-50 text-green-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                              Active
                            </span>
                          ) : (
                            <span className="inline-block bg-red-50 text-red-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={handleToggleUserStatus.bind(null, user.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              user.isActive
                                ? "bg-red-50 text-red-700 hover:bg-red-100"
                                : "bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {user.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;