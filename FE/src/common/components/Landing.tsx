import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  LogIn,
  CheckSquare,
  BarChart2,
  ShieldCheck,
  ArrowRight,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: <LayoutDashboard className="w-4 h-4" />,
    bg: "bg-[#EEF2FF]",
    color: "text-[#5A67D8]",
    title: "Dashboard",
    desc: "Real-time analytics and progress charts.",
  },
  {
    icon: <CheckSquare className="w-4 h-4" />,
    bg: "bg-[#E6FFFA]",
    color: "text-[#38B2AC]",
    title: "Task tracking",
    desc: "Organize and prioritize across your workspace.",
  },
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    bg: "bg-[#FFF5E6]",
    color: "text-[#ED8936]",
    title: "Role control",
    desc: "Granular admin and user permissions.",
  },
  {
    icon: <BarChart2 className="w-4 h-4" />,
    bg: "bg-[#F0FFF4]",
    color: "text-[#48BB78]",
    title: "Analytics",
    desc: "Weekly, monthly and yearly task reports.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
          {/* Left — Logo */}
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 bg-[#5A67D8] rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-tight">Task Vault</span>
          </Link>

          {/* Right — Auth */}
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#5A67D8] text-white rounded-lg text-sm font-semibold hover:bg-[#434190] transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Join free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-8 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-12">

          {/* Left — copy */}
          <div className="flex-1 flex flex-col items-start">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF2FF] border border-[#C7D2F8] rounded-full text-xs font-semibold text-[#5A67D8] mb-5">
              <Zap className="w-3 h-3" />
              Built for modern teams
            </div>

            {/* Headline — single line, no wrapping issue */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
              The smarter way to<br />
              <span className="text-[#5A67D8]">manage your tasks</span>
            </h1>

            <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-sm">
              Track, prioritize, and ship work — with real-time dashboards, role-based access, and powerful analytics.
            </p>

            {/* CTAs */}
            <div className="flex flex-row gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A67D8] text-white rounded-xl text-sm font-semibold hover:bg-[#434190] transition-colors shadow-md shadow-indigo-100"
              >
                <UserPlus className="w-4 h-4" />
                Start for free
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Right — visual card cluster */}
          <div className="flex-1 w-full max-w-md">
            <div className="bg-[#F3F4FE] rounded-2xl p-5 flex flex-col gap-3">

              {/* Mini dashboard preview */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-700">Task overview</p>
                  <span className="text-[10px] text-gray-400">Today</span>
                </div>
                <div className="flex gap-2 mb-3">
                  {[
                    { label: "Total", value: "24", color: "bg-[#EEF2FF] text-[#5A67D8]" },
                    { label: "Done", value: "18", color: "bg-[#F0FFF4] text-[#48BB78]" },
                    { label: "Overdue", value: "2", color: "bg-[#FFF5F5] text-[#E53E3E]" },
                  ].map((stat) => (
                    <div key={stat.label} className={`flex-1 rounded-lg px-3 py-2 ${stat.color}`}>
                      <p className="text-lg font-bold leading-none">{stat.value}</p>
                      <p className="text-[10px] mt-0.5 opacity-75">{stat.label}</p>
                    </div>
                  ))}
                </div>
                {/* Mini bar chart */}
                <div className="flex items-end gap-1 h-10">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${h}%`,
                        background: i === 5 ? "#5A67D8" : "#EEF2FF",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Recent task rows */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-2.5">Recent tasks</p>
                <div className="flex flex-col gap-2">
                  {[
                    { name: "Design new onboarding", status: "Done", statusColor: "bg-[#F0FFF4] text-[#48BB78]", priority: "High", priorityColor: "bg-[#FFF5F5] text-[#E53E3E]" },
                    { name: "Fix authentication bug", status: "In Progress", statusColor: "bg-[#EEF2FF] text-[#5A67D8]", priority: "High", priorityColor: "bg-[#FFF5F5] text-[#E53E3E]" },
                    { name: "Update API docs", status: "Todo", statusColor: "bg-gray-50 text-gray-500", priority: "Low", priorityColor: "bg-[#F0FFF4] text-[#48BB78]" },
                  ].map((task) => (
                    <div key={task.name} className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-700 truncate flex-1">{task.name}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${task.statusColor}`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features strip ── */}
        <section className="border-t border-gray-100 bg-gray-50/50">
          <div className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className={`w-8 h-8 rounded-lg ${f.bg} flex items-center justify-center mb-3`}>
                  <span className={f.color}>{f.icon}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">{f.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-5">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#5A67D8] rounded-md flex items-center justify-center">
              <LayoutDashboard className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-400">Task Vault</span>
          </div>
          <p className="text-xs text-gray-300">© 2026 Task Vault Inc.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;