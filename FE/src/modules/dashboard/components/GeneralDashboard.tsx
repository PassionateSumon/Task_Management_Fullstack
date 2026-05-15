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
} from "recharts";
import { DotLoader } from "react-spinners";

const COLORS = ["#5A67D8", "#38B2AC", "#E53E3E"];

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
  return (
    <div className="bg-[#F3F4FE] h-[94vh] overflow-y-auto p-6 text-[#2D3748] thin-scrollbar ">
      <h1 className="text-2xl font-bold mb-6">Personal Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg">Total Tasks</h2>
          <p className="text-2xl mt-2">{data.totalTasks}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg">Completed Tasks</h2>
          <p className="text-2xl mt-2">{data.completedTasks}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg">Overdue Tasks</h2>
          <p className="text-2xl mt-2">{data.overdueTasks}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg">Pending Tasks</h2>
          <p className="text-2xl mt-2">{data.pendingTasks}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg">Completion Rate</h2>
          <p className="text-2xl mt-2">{data.completionRate}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg mb-4">Tasks By Priority</h2>
          <ResponsiveContainer
            width="100%"
            height={250}
            className="cursor-pointer"
          >
            <PieChart>
              <Pie
                dataKey="value"
                data={[
                  { name: "High", value: data?.tasksByPriority?.high },
                  { name: "Medium", value: data?.tasksByPriority?.medium },
                  { name: "Low", value: data?.tasksByPriority?.low },
                  { name: "No proiority", value: data?.tasksByPriority?.null },
                ]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                className="cursor-pointer"
                label
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold text-lg mb-4">Tasks By Status</h2>
          <ResponsiveContainer
            width="100%"
            height={250}
            className="cursor-pointer"
          >
            <BarChart data={data.tasksByStatus}>
              <XAxis dataKey="statusName" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="#5A67D8"
                radius={[4, 4, 0, 0]}
                className="cursor-pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default GeneralDashboard;
