import {
  AtSign,
  Lock,
  Mail,
  User,
} from "lucide-react";
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
      if (isEmail(value) === false && value.includes("@"))
        return "Invalid email format.";
    }
    if (field === "password" && !value) return "Password is required.";
  }
  return null;
};

const Auth: FC<AuthProps> = ({ from }) => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    emailOrUsername: "",
    password: "",
    user_type: "admin",
  });

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormData, string | null>>
  >({});

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (error) {
      toast.error(error, { toastId: "auth-error" });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
    key: keyof FormData
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));

    const err = getFieldError(key, { ...formData, [key]: value }, from);
    setFieldErrors((prev) => ({
      ...prev,
      [key]: err || "",
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    // Prevent default form submission behavior (page reload)
    if (e) e.preventDefault();

    const newErrors: Partial<Record<keyof FormData, string | null>> = {};

    const fields = from === "signup"
      ? ["name", "email", "password"]
      : ["emailOrUsername", "password"];

    fields.forEach((field) => {
      newErrors[field as keyof FormData] = getFieldError(
        field as keyof FormData,
        formData,
        from
      );
    });

    setFieldErrors(newErrors);
    if (Object.values(newErrors).some((err) => err)) return;

    // const hashedPassword = await Hash.hashPassword(formData.password);

    const action = from === "signup"
      ? signup({
        name: formData.name!,
        email: formData.email!,
        password: formData.password!,
        user_type: formData.user_type,
      })
      : login({
        emailOrUsername: formData.emailOrUsername,
        password: formData.password,
      });

    // @ts-expect-error: dispatch type mismatch for async thunk
    const result = await dispatch(action);

    if ((from === "signup" && signup.fulfilled.match(result)) ||
      (from === "login" && login.fulfilled.match(result))) {
      setFormData({
        name: "",
        email: "",
        emailOrUsername: "",
        password: "",
        user_type: "admin",
      });
      setFieldErrors({});
      toast.success(`${from === "signup" ? "Signup" : "Login"} successful!`, {
        toastId: "auth-success",
      });
      navigate(from === "signup" ? "/login" : "/home/task");
    }
  };

  const renderInput = (
    label: string,
    key: keyof FormData,
    type: string,
    Icon: any
  ) => (
    <div className="space-y-1.5 w-full">
      <label htmlFor={key} className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
        {label}
      </label>
      <div 
        className={`flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-200 
        ${fieldErrors[key] 
            ? "border-red-400 bg-red-50/30" 
            : "border-slate-100 bg-slate-50 focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-sm"
        }`}
      >
        <Icon className={`w-5 h-5 mr-3 transition-colors ${fieldErrors[key] ? "text-red-500" : "text-slate-400"}`} />
        <input
          id={key}
          type={type}
          placeholder={`Enter your ${label.toLowerCase()}`}
          value={formData[key] as string}
          onChange={(e) => handleChange(e, key)}
          className="w-full outline-none bg-transparent text-slate-800 placeholder:text-slate-400 text-sm font-medium"
        />
      </div>
      {fieldErrors[key] && (
        <span className="text-[11px] font-semibold text-red-500 ml-1 italic">{fieldErrors[key]}</span>
      )}
    </div>
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f8fafc] px-4 font-sans">
      <div className="bg-white p-10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-md border border-slate-50">
        <header className="mb-10 text-center">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {from === "signup" ? "Get Started" : "Welcome Back"}
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            {from === "signup" ? "Create your account to start managing tasks" : "Enter your credentials to continue"}
          </p>
        </header>

        {/* Wrapped in a form to enable 'Enter' key submission */}
        <form 
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {from === "signup" && renderInput("Full Name", "name", "text", User)}

          {from === "signup"
            ? renderInput("Email", "email", "email", Mail)
            : renderInput("Email / Username", "emailOrUsername", "text", AtSign)}

          {renderInput("Password", "password", "password", Lock)}

          {from === "signup" && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Role</label>
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  type="button" // Important: prevents this button from submitting the form
                  onClick={() => setFormData((prev) => ({ ...prev, user_type: "admin" }))}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                    formData.user_type === "admin"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button" // Important: prevents this button from submitting the form
                  onClick={() => setFormData((prev) => ({ ...prev, user_type: "user" }))}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                    formData.user_type === "user"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  User
                </button>
              </div>
            </div>
          )}

          <button
            type="submit" // Triggers handleSubmit on 'Enter'
            disabled={loading}
            className={`w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed mt-4 text-sm tracking-wide uppercase cursor-pointer`}
          >
            {loading ? "Processing..." : from === "signup" ? "Create Account" : "Sign In"}
          </button>

          <footer className="text-center pt-4">
            <span className="text-sm text-slate-500 font-medium">
              {from === "signup" ? (
                <>
                  Already have an account?{" "}
                  <Link to="/login" className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors cursor-pointer">
                    Login
                  </Link>
                </>
              ) : (
                <div className="space-y-1">
                  <div>
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors cursor-pointer">
                      Sign up
                    </Link>
                  </div>
                </div>
              )}
            </span>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default Auth;
