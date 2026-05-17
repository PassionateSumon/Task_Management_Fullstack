import { AtSign, Lock, Mail, User, LayoutDashboard, CheckSquare, BarChart2, ShieldCheck } from "lucide-react";
import { useState, type ChangeEvent, type FC, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { login, signup, clearError } from "../slices/AuthSlice";
import type { AppDispatch, RootState } from "../../../store/store";
import type { AuthProps, FormData } from "../types/Auth.interface";
import { toast } from "react-toastify";
import { getStrictPasswordError } from "../../../common/validation/password";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getFieldError = (
  field: keyof FormData,
  formData: FormData,
  from: "signup" | "login"
) => {
  const value = formData[field]?.trim() || "";
  if (from === "signup") {
    if (field === "name" && !value) return "Name is required.";
    if (field === "email") {
      if (!value) return "Email is required.";
      if (!isEmail(value)) return "Invalid email format.";
    }
    if (field === "password" && !value) return "Password is required.";
    if (field === "password" && value) {
      const err = getStrictPasswordError(value);
      if (err && err !== "Password is required.") return err;
    }
  } else {
    if (field === "emailOrUsername") {
      if (!value) return "Email or Username is required.";
      if (!isEmail(value) && value.includes("@")) return "Invalid email format.";
    }
    if (field === "password" && !value) return "Password is required.";
  }
  return null;
};

const features = [
  { icon: <CheckSquare className="w-4 h-4" />, label: "Task tracking" },
  { icon: <BarChart2 className="w-4 h-4" />,   label: "Analytics dashboard" },
  { icon: <ShieldCheck className="w-4 h-4" />, label: "Role-based access" },
];

const Auth: FC<AuthProps> = ({ from }) => {
  const [formData, setFormData] = useState<FormData>({
    name: "", email: "", emailOrUsername: "", password: "", user_type: "admin",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string | null>>>({});

  const dispatch = useDispatch<AppDispatch>();
  const navigate  = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (error) { toast.error(error, { toastId: "auth-error" }); dispatch(clearError()); }
  }, [error, dispatch]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>, key: keyof FormData) => {
    const value = e.target.value;
    setFormData(p => ({ ...p, [key]: value }));
    setFieldErrors(p => ({ ...p, [key]: getFieldError(key, { ...formData, [key]: value }, from) || "" }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fields = from === "signup" ? ["name", "email", "password"] : ["emailOrUsername", "password"];
    const newErrors: Partial<Record<keyof FormData, string | null>> = {};
    fields.forEach(f => { newErrors[f as keyof FormData] = getFieldError(f as keyof FormData, formData, from); });
    setFieldErrors(newErrors);
    if (Object.values(newErrors).some(e => e)) return;

    const action = from === "signup"
      ? signup({ name: formData.name!, email: formData.email!, password: formData.password!, user_type: formData.user_type })
      : login({ emailOrUsername: formData.emailOrUsername, password: formData.password });

    const result = await dispatch(action as any);

    if ((from === "signup" && signup.fulfilled.match(result)) || (from === "login" && login.fulfilled.match(result))) {
      setFormData({ name: "", email: "", emailOrUsername: "", password: "", user_type: "admin" });
      setFieldErrors({});
      toast.success(`${from === "signup" ? "Signup" : "Login"} successful!`, { toastId: "auth-success" });
      navigate(from === "signup" ? "/login" : "/home/task");
    }
  };

  const renderInput = (label: string, key: keyof FormData, type: string, Icon: any) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={key} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </label>
      <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${
        fieldErrors[key]
          ? "border-red-300 bg-red-50"
          : "border-gray-200 bg-[#F3F4FE] focus-within:border-[#5A67D8] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#5A67D8]/10"
      }`}>
        <Icon className={`w-4 h-4 flex-shrink-0 ${fieldErrors[key] ? "text-red-400" : "text-gray-400"}`} />
        <input
          id={key}
          type={type}
          placeholder={`Enter your ${label.toLowerCase()}`}
          value={formData[key] as string}
          onChange={e => handleChange(e, key)}
          className="flex-1 outline-none bg-transparent text-sm text-gray-800 placeholder-gray-400"
        />
      </div>
      {fieldErrors[key] && (
        <p className="text-[11px] text-red-500 font-medium">{fieldErrors[key]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-white">

      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-[#5A67D8] flex-col justify-between p-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span
          className="text-white font-bold text-base tracking-tight cursor-pointer"
          onClick={() => navigate("/")}
          >
            Task Vault
          </span>
        </div>

        {/* Center copy */}
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-snug tracking-tight">
              The smarter way<br />to manage work
            </h2>
            <p className="text-white/60 text-sm mt-3 leading-relaxed max-w-xs">
              Track tasks, analyze progress, and collaborate — all in one place.
            </p>
          </div>

          {/* Feature list */}
          <div className="flex flex-col gap-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-white">{f.icon}</span>
                </div>
                <span className="text-white/80 text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-white/30 text-xs">© 2026 Task Vault Inc.</p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#F3F4FE]">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-[#5A67D8] rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Task Vault</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {/* Header */}
            <div className="mb-7">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {from === "signup" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {from === "signup"
                  ? "Start managing tasks in minutes."
                  : "Enter your credentials to continue."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {from === "signup" && renderInput("Full Name", "name", "text", User)}
              {from === "signup"
                ? renderInput("Email", "email", "email", Mail)
                : renderInput("Email / Username", "emailOrUsername", "text", AtSign)}
              {renderInput("Password", "password", "password", Lock)}

              {/* Role selector */}
              {from === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F3F4FE] rounded-lg border border-gray-200">
                    {(["admin", "user"] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, user_type: role }))}
                        className={`py-2 rounded-md text-sm font-semibold transition-all cursor-pointer capitalize ${
                          formData.user_type === role
                            ? "bg-white text-[#5A67D8] shadow-sm border border-gray-100"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#5A67D8] hover:bg-[#434190] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-1 cursor-pointer shadow-md shadow-indigo-100"
              >
                {loading ? "Processing..." : from === "signup" ? "Create Account" : "Sign In"}
              </button>

              {/* Footer link */}
              <p className="text-center text-sm text-gray-400 pt-1">
                {from === "signup" ? (
                  <>Already have an account?{" "}
                    <Link to="/login" className="text-[#5A67D8] font-semibold hover:text-[#434190] transition-colors">
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>Don't have an account?{" "}
                    <Link to="/signup" className="text-[#5A67D8] font-semibold hover:text-[#434190] transition-colors">
                      Sign up
                    </Link>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;