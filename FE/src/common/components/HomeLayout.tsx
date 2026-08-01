import { useDispatch, useSelector } from "react-redux";
import { Outlet, NavLink } from "react-router-dom";
import type { AppDispatch, RootState } from "../../store/store";
import { logout } from "../../modules/auth/slices/AuthSlice";
import {
  LayoutDashboard,
  LogOut,
  CheckSquare,
  Activity,
  BarChart2,
  ShieldCheck,
} from "lucide-react";

const HomeLayout = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { role } = useSelector((state: RootState) => state.auth);

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-[#EEF2FF] text-[#5A67D8] font-semibold"
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium"
    }`;

  const initial = role ? role.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex h-screen overflow-hidden bg-[#F3F4FE]">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen">

        {/* Logo — fixed at top */}
        <div className="flex items-center gap-2.5 px-5 py-5 flex-shrink-0">
          <div className="w-7 h-7 bg-[#5A67D8] rounded-lg flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900 tracking-tight">Task Vault</span>
        </div>

        {/* Nav links — scrollable middle zone if needed */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-5 min-h-0 thin-scrollbar"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#E2E8F0 transparent" }}
        >

          {/* Core Menu */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">
              Core Menu
            </p>
            <nav className="flex flex-col gap-0.5">
              <NavLink to="task" className={navLink}>
                <CheckSquare className="w-4 h-4 flex-shrink-0" />
                Tasks
              </NavLink>
              {role === "admin" && (
                <NavLink to="status" className={navLink}>
                  <Activity className="w-4 h-4 flex-shrink-0" />
                  Status
                </NavLink>
              )}
            </nav>
          </div>

          {/* Analytics */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">
              Analytics
            </p>
            <nav className="flex flex-col gap-0.5">
              <NavLink to="dashboard/me" end className={navLink}>
                <BarChart2 className="w-4 h-4 flex-shrink-0" />
                Personal Board
              </NavLink>
              {role === "admin" && (
                <NavLink to="dashboard" end className={navLink}>
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  Admin Board
                </NavLink>
              )}
            </nav>
          </div>
        </div>

        {/* Bottom — always pinned, never overlaps */}
        <div className="flex-shrink-0 border-t border-gray-100 px-3 py-3 flex flex-col gap-0.5">
          <NavLink
            to="profile"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                isActive ? "bg-[#EEF2FF]" : "hover:bg-gray-50"
              }`
            }
          >
            <div className="w-7 h-7 rounded-lg bg-[#5A67D8] flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{initial}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 leading-tight">My Profile</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{role}</p>
            </div>
          </NavLink>

          <button
            onClick={() => dispatch(logout())}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer group w-full"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content — only this scrolls ── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default HomeLayout;