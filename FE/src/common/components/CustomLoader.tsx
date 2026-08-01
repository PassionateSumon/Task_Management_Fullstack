import { LayoutDashboard } from "lucide-react";

interface CustomLoaderProps {
  overlay?: boolean;
}

export const CustomLoader = ({ overlay = false }: CustomLoaderProps) => (
  <div
    className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 ${
      overlay
        ? "bg-white/60 backdrop-blur-sm"
        : "bg-[#F3F4FE]"
    }`}
  >
    {/* Logo mark */}
    <div className="relative flex items-center justify-center">
      {/* Spinning ring */}
      <div className="absolute w-14 h-14 rounded-full border-2 border-transparent border-t-[#5A67D8] border-r-[#5A67D8]/30 animate-spin" />
      {/* Icon center */}
      <div className="w-9 h-9 bg-[#5A67D8] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
        <LayoutDashboard className="w-4 h-4 text-white" />
      </div>
    </div>

    {/* Dots */}
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#5A67D8] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  </div>
);
